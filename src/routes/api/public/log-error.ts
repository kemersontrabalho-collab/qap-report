import { createFileRoute } from "@tanstack/react-router";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { logError } from "@/lib/monitoring.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

const bodySchema = z.object({
  category: z.enum(["frontend", "performance"]).default("frontend"),
  severity: z.enum(["info", "warning", "error", "critical"]).default("error"),
  message: z.string().min(1).max(4000),
  stack: z.string().max(8000).optional(),
  route: z.string().max(512).optional(),
  metadata: z.record(z.unknown()).optional(),
});

async function resolveUserIdFromBearer(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/api/public/log-error")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = bodySchema.safeParse(raw);
          if (!parsed.success) {
            return new Response(JSON.stringify({ ok: false, error: "invalid_payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }
          // Nunca confiar em userId enviado pelo cliente. Só grava o dono
          // quando a requisição carrega um bearer Supabase válido.
          const userId = await resolveUserIdFromBearer(request);
          await logError({
            category: parsed.data.category,
            severity: parsed.data.severity,
            message: parsed.data.message,
            stack: parsed.data.stack ?? null,
            route: parsed.data.route ?? null,
            userId,
            metadata: parsed.data.metadata ?? {},
            userAgent: getRequestHeader("user-agent") ?? null,
            ip: getRequestIP({ xForwardedFor: true }) ?? null,
          });

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch {
          return new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
