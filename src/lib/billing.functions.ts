import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  addMonths,
  createCardPreference,
  createPixPayment,
  fetchMP,
  generateCouponCode,
  getPlanDuration,
  getPlanLabel,
  processPaymentByExternalId,
} from "./billing.server";

const planEnum = z.enum(["monthly", "yearly"]);
const paymentMethodEnum = z.enum(["pix", "card"]);

export const getBillingSettings = createServerFn({ method: "GET" }).handler(async () => {
  const { data: rows } = await supabaseAdmin.from("app_settings").select("key, value").in("key", [
    "monthly_price",
    "yearly_price",
    "pix_key",
    "terms_of_use",
    "support_email",
  ]);
  const obj: Record<string, string> = {};
  for (const r of rows ?? []) obj[r.key] = r.value ?? "";
  return {
    monthlyPrice: Number(obj.monthly_price || "10"),
    yearlyPrice: Number(obj.yearly_price || "90"),
    pixKey: obj.pix_key || "dc748121-4fd1-4277-b987-7b4b5aa2de0f",
    terms: obj.terms_of_use || defaultTerms(),
    supportEmail: obj.support_email || "suporte@qapreport.app",
  };
});

export const getSubscriptionStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await syncSubscriptionStatus(context.userId);
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("status, current_period_end, plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    const { data: isFounder } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "fundador" });
    const now = new Date();
    const active =
      isFounder ||
      (sub &&
        (sub.status === "active" || sub.status === "trial") &&
        new Date(sub.current_period_end) > now);
    return { active, status: sub?.status ?? "none", validUntil: sub?.current_period_end ?? null, isFounder };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: payments } = await context.supabase
      .from("payments")
      .select("id, amount, payment_method, status, paid_at, plan")
      .eq("user_id", userId)
      .order("paid_at", { ascending: false });

    const { data: redemptions } = await context.supabase
      .from("coupon_redemptions")
      .select("id, redeemed_at, duration_months, coupons(code)")
      .eq("user_id", userId)
      .order("redeemed_at", { ascending: false });

    return {
      subscription: sub,
      payments: payments ?? [],
      redemptions: redemptions ?? [],
    };
  });

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        plan: planEnum,
        paymentMethod: paymentMethodEnum,
        couponCode: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: profile } = await context.supabase.from("profiles").select("email").eq("id", userId).single();
    const email = profile?.email ?? "";

    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("key", ["monthly_price", "yearly_price"])
      .returns<{ key: string; value: string }[]>();
    const priceMap: Record<string, number> = {};
    for (const s of settings ?? []) priceMap[s.key] = Number(s.value);
    const basePrice = data.plan === "yearly" ? priceMap.yearly_price ?? 90 : priceMap.monthly_price ?? 10;

    let finalPrice = basePrice;
    let couponApplied = null as null | { code: string; durationMonths: number };

    if (data.couponCode?.trim()) {
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, code, duration_months, max_uses, used_count, expires_at")
        .eq("code", data.couponCode.trim())
        .maybeSingle();

      if (!coupon) throw new Error("Cupom inválido");
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Cupom expirado");
      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) throw new Error("Cupom esgotado");

      const { data: existingRedemption } = await supabaseAdmin
        .from("coupon_redemptions")
        .select("id")
        .eq("coupon_id", coupon.id)
        .eq("user_id", userId)
        .maybeSingle();
      if (existingRedemption) throw new Error("Você já utilizou este cupom");

      finalPrice = 0;
      couponApplied = { code: coupon.code, durationMonths: coupon.duration_months };
    }

    if (finalPrice === 0 && couponApplied) {
      await applyCouponAccess(userId, couponApplied.code, couponApplied.durationMonths);
      return { type: "coupon", couponCode: couponApplied.code, durationMonths: couponApplied.durationMonths };
    }

    const externalRef = `qap-${userId}-${data.plan}-${Date.now()}`;

    if (data.paymentMethod === "pix") {
      const result = await createPixPayment(userId, email, data.plan, finalPrice, externalRef);
      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        external_id: result.paymentId,
        external_payment_method_id: "pix",
        amount: finalPrice,
        currency: "BRL",
        status: result.status,
        payment_method: "pix",
        plan: data.plan,
      });
      return { type: "pix", ...result };
    }

    const result = await createCardPreference(userId, email, data.plan, finalPrice, externalRef);
    await supabaseAdmin.from("payments").insert({
      user_id: userId,
      external_id: result.preferenceId,
      external_payment_method_id: "preference",
      amount: finalPrice,
      currency: "BRL",
      status: "pending",
      payment_method: "credit_card",
      plan: data.plan,
    });
    return { type: "card", ...result };
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ code: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    await applyCouponAccess(context.userId, data.code);
    return { ok: true };
  });

export const checkPixPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paymentId: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: payment } = await context.supabase
      .from("payments")
      .select("external_id, status")
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!payment || !payment.external_id) return { status: "not_found" };
    if (payment.status === "approved") return { status: "approved" };
    const mp = await fetchMP(`/v1/payments/${payment.external_id}`);
    const status = mp.status;
    if (status === "approved") {
      await processPaymentByExternalId(payment.external_id);
    }
    return { status: status ?? payment.status };
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("id, current_period_end")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!sub) throw new Error("Assinatura não encontrada");
    await context.supabase
      .from("subscriptions")
      .update({ status: "canceled", canceled_at: new Date().toISOString() })
      .eq("id", sub.id);
    return { validUntil: sub.current_period_end };
  });

export const adminListCoupons = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: isFounder } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "fundador" });
  if (!isFounder) throw new Error("Acesso negado");
  const { data: coupons } = await supabaseAdmin
    .from("coupons")
    .select("*, coupon_redemptions(id, user_id, redeemed_at, duration_months)")
    .order("created_at", { ascending: false });
  return { coupons: coupons ?? [] };
});

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        durationMonths: z.number().int().min(1).max(12),
        maxUses: z.number().int().min(1).optional(),
        expiresAt: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isFounder } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "fundador" });
    if (!isFounder) throw new Error("Acesso negado");
    let code = generateCouponCode();
    for (let i = 0; i < 10; i++) {
      const { data: exists } = await supabaseAdmin.from("coupons").select("id").eq("code", code).maybeSingle();
      if (!exists) break;
      code = generateCouponCode();
    }
    const { data: inserted } = await supabaseAdmin
      .from("coupons")
      .insert({
        code,
        duration_months: data.durationMonths,
        max_uses: data.maxUses ?? 1,
        created_by: context.userId,
        expires_at: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      })
      .select("code")
      .single();
    return { code: inserted?.code ?? code };
  });

export const adminUpdatePrices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        monthlyPrice: z.number().min(1),
        yearlyPrice: z.number().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isFounder } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "fundador" });
    if (!isFounder) throw new Error("Acesso negado");
    await supabaseAdmin
      .from("app_settings")
      .update({ value: String(data.monthlyPrice) })
      .eq("key", "monthly_price");
    await supabaseAdmin
      .from("app_settings")
      .update({ value: String(data.yearlyPrice) })
      .eq("key", "yearly_price");
    return { ok: true };
  });

export const refreshSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await syncSubscriptionStatus(context.userId);
    return { ok: true };
  });

async function applyCouponAccess(userId: string, code: string, fallbackDuration = 1) {
  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("id, duration_months, max_uses, used_count, expires_at")
    .eq("code", code.trim())
    .maybeSingle();
  if (!coupon) throw new Error("Cupom inválido");
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("Cupom expirado");
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) throw new Error("Cupom esgotado");

  const { data: existing } = await supabaseAdmin
    .from("coupon_redemptions")
    .select("id")
    .eq("coupon_id", coupon.id)
    .eq("user_id", userId)
    .maybeSingle();
  if (existing) throw new Error("Você já utilizou este cupom");

  const durationMonths = coupon.duration_months ?? fallbackDuration;
  const now = new Date();
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, current_period_end, status")
    .eq("user_id", userId)
    .maybeSingle();
  const start = sub && new Date(sub.current_period_end) > now ? new Date(sub.current_period_end) : now;
  const end = addMonths(start, durationMonths);

  await supabaseAdmin.from("coupon_redemptions").insert({
    coupon_id: coupon.id,
    user_id: userId,
  });
  await supabaseAdmin.from("coupons").update({ used_count: coupon.used_count + 1 }).eq("id", coupon.id);

  const payload = {
    user_id: userId,
    status: "active" as const,
    plan: "monthly" as const,
    trial_ends_at: null,
    current_period_start: start.toISOString(),
    current_period_end: end.toISOString(),
    canceled_at: null,
    payment_method: "coupon" as const,
  };
  if (sub) {
    await supabaseAdmin.from("subscriptions").update(payload).eq("id", sub.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert(payload);
  }
}

async function syncSubscriptionStatus(userId: string) {
  const now = new Date().toISOString();
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, current_period_end, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (!sub) return;
  if (sub.current_period_end && sub.current_period_end < now && sub.status !== "expired") {
    await supabaseAdmin.from("subscriptions").update({ status: "expired" }).eq("id", sub.id);
  }
}

function defaultTerms(): string {
  return [
    "Ao adquirir o plano QAP Report, você concorda com os seguintes termos:",
    "1. O pagamento é feito de forma antecipada e não reembolsável.",
    "2. O acesso às funcionalidades premium é mantido até o fim do período contratado, mesmo em caso de cancelamento.",
    "3. O cancelamento impede a renovação automática, mas não gera restituição do valor pago.",
    "4. Os valores dos planos podem ser alterados apenas ao término do ciclo atual; novas adesões ou renovações serão feitas pelos valores vigentes no momento da contratação.",
    "5. Você é responsável pelas informações inseridas no aplicativo e pelos procedimentos policiais adotados com base no conteúdo gerado.",
    "6. Em caso de dúvidas, entre em contato pelo suporte.",
  ].join("\n");
}
