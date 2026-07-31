import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    if (!userId) throw new Error("Não autenticado.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ordem respeita FKs. Falhas em tabelas dependentes abortam a exclusão do auth.user.
    const steps: Array<[string, PromiseLike<{ error: { message?: string } | null }>]> = [
      [
        "bulletin_knowledge",
        supabaseAdmin.from("bulletin_knowledge").delete().eq("owner_id", userId),
      ],
      ["bulletins", supabaseAdmin.from("bulletins").delete().eq("user_id", userId)],
      [
        "notification_reads",
        supabaseAdmin.from("notification_reads").delete().eq("user_id", userId),
      ],
      [
        "coupon_redemptions",
        supabaseAdmin.from("coupon_redemptions").delete().eq("user_id", userId),
      ],
      [
        "pix_payment_requests",
        supabaseAdmin.from("pix_payment_requests").delete().eq("user_id", userId),
      ],
      ["payments", supabaseAdmin.from("payments").delete().eq("user_id", userId)],
      ["subscriptions", supabaseAdmin.from("subscriptions").delete().eq("user_id", userId)],
      ["user_roles", supabaseAdmin.from("user_roles").delete().eq("user_id", userId)],
      ["profiles", supabaseAdmin.from("profiles").delete().eq("id", userId)],
    ];

    for (const [table, p] of steps) {
      const { error } = await p;
      if (error) {
        throw new Error(`Falha ao remover ${table}: ${error.message ?? "erro"}`);
      }
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error(`Falha ao remover conta: ${authErr.message}`);

    return { ok: true };
  });
