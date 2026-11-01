import { createFileRoute } from "@tanstack/react-router";

/**
 * Transcrição de áudio (fallback do ditado por voz).
 * Usado quando o reconhecimento de voz nativo do navegador não existe
 * (iOS instalado como app, Firefox) ou falha (rede/serviço bloqueado).
 * Exige sessão válida e acesso premium; o áudio não é armazenado.
 */
const MAX_BYTES = 12 * 1024 * 1024;
const MODEL = "openai/gpt-transcribe";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
        if (!token || token.split(".").length !== 3) {
          return json(401, { error: "Sessão expirada. Entre novamente." });
        }

        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!url || !key || !apiKey) return json(500, { error: "Serviço indisponível." });

        const { createClient } = await import("@supabase/supabase-js");
        const supabase = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        });
        const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsErr || !userId) return json(401, { error: "Sessão expirada. Entre novamente." });

        const { data: premium } = await supabase.rpc("is_premium_user", { _user_id: userId });
        if (!premium) {
          return json(403, {
            error: "Seu período de teste acabou. Assine um plano para continuar.",
          });
        }

        const declared = Number(request.headers.get("content-length") ?? "0");
        if (declared > MAX_BYTES + 64 * 1024) {
          return json(413, { error: "Áudio muito longo. Grave trechos menores." });
        }

        let file: File | null = null;
        try {
          const form = await request.formData();
          const f = form.get("file");
          file = f instanceof File ? f : null;
        } catch {
          return json(400, { error: "Áudio inválido." });
        }
        if (!file || file.size < 2048) return json(400, { error: "Não foi captado áudio. Tente novamente." });
        if (file.size > MAX_BYTES) return json(413, { error: "Áudio muito longo. Grave trechos menores." });
        if (!file.type.startsWith("audio/")) return json(400, { error: "Formato de áudio inválido." });

        const upstreamForm = new FormData();
        upstreamForm.append("model", MODEL);
        upstreamForm.append("file", file, file.name || "ditado.wav");
        upstreamForm.append("response_format", "json");
        upstreamForm.append("stream", "true");
        upstreamForm.append(
          "prompt",
          "Ditado em português do Brasil de um policial militar relatando uma ocorrência.",
        );

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstreamForm,
          signal: request.signal,
        });

        if (!upstream.ok || !upstream.body) {
          const status = upstream.status;
          console.error("[transcribe] gateway error", status, await upstream.text().catch(() => ""));
          const msg =
            status === 429
              ? "Muitas solicitações. Aguarde alguns segundos."
              : status === 402
                ? "Serviço de voz temporariamente indisponível."
                : status === 400
                  ? "Não foi possível entender o áudio. Grave novamente."
                  : "Falha na transcrição. Tente novamente.";
          return json(status >= 400 ? status : 502, { error: msg });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "text/event-stream",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
