import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const supportInput = z.object({
  subject: z.enum(["duvida", "reclamacao", "sugestao", "outro"]),
  message: z.string().trim().min(5).max(2000),
});

export const sendSupportMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => supportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, supabase } = context;

    // Get sender profile info
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .maybeSingle();

    // Find founders
    const { data: founders, error: fErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "fundador");
    if (fErr) throw new Error(fErr.message);
    if (!founders || founders.length === 0) {
      throw new Error("Nenhum administrador disponível no momento.");
    }

    const labels: Record<string, string> = {
      duvida: "Dúvida",
      reclamacao: "Reclamação",
      sugestao: "Sugestão",
      outro: "Mensagem",
    };
    const senderName = (profile as any)?.full_name || (profile as any)?.email || "Usuário";
    const senderEmail = (profile as any)?.email ?? "";

    const rows = founders.map((f: any) => ({
      title: `[Suporte · ${labels[data.subject]}] ${senderName}`,
      body: `De: ${senderName}${senderEmail ? ` <${senderEmail}>` : ""}\n\n${data.message}`,
      audience: "user" as const,
      target_user_id: f.user_id,
      category: "support",
      created_by: userId,
    }));

    const { error } = await supabaseAdmin.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
