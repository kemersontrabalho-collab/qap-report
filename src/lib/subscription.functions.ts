import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const planSchema = z.enum(["mensal"]);

/**
 * Retorna o status atual da assinatura do usuário logado e
 * a solicitação Pix pendente, se houver.
 */
export const getMySubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [subRes, pendingRes, premiumRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("status, plan, current_period_end, trial_ends_at, payment_method")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("pix_payment_requests")
        .select("id, plan, amount_brl, status, created_at")
        .eq("user_id", userId)
        .eq("status", "aguardando_aprovacao")
        .maybeSingle(),
      supabase.rpc("is_premium_user", { _user_id: userId }),
    ]);

    return {
      subscription: subRes.data ?? null,
      pendingPix: pendingRes.data ?? null,
      isPremium: !!premiumRes.data,
    };
  });

/**
 * Cria uma solicitação de pagamento Pix (atômico via RPC).
 * Se já existir uma pendente, retorna a mesma sem duplicar.
 */
export const createPixRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { plan: "mensal" }) => ({
    plan: planSchema.parse(data.plan),
  }))
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("create_pix_payment_request", {
      _user_id: userId,
      _plan: data.plan,
    });

    if (error) throw new Error(error.message);
    return result as {
      ok: boolean;
      already_pending: boolean;
      request_id: string;
    };
  });

/**
 * Cancela a própria solicitação Pix pendente.
 */
export const cancelPixRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { requestId: string }) =>
    z.object({ requestId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("cancel_pix_payment_request", {
      _user_id: userId,
      _request_id: data.requestId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Resgata um código promocional (cupom/gift card).
 * A sanitização (uppercase, remoção de espaços/símbolos) acontece
 * tanto no cliente quanto no servidor (defensiva).
 */
export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => {
    const cleaned = String(data.code ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 4) {
      throw new Error("Código inválido. Use apenas letras e números.");
    }
    return { code: cleaned };
  })
  .handler(async ({ context, data }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("redeem_coupon", {
      _user_id: userId,
      _code: data.code,
    });

    if (error) throw new Error(error.message);
    return result as {
      ok: boolean;
      grants_lifetime: boolean;
      duration_months: number;
    };
  });
