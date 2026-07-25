import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const MP_BASE = "https://api.mercadopago.com";

export function getMPAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Mercado Pago não configurado");
  return token;
}

export function getWebhookSecret(): string {
  return process.env.MERCADO_PAGO_WEBHOOK_SECRET ?? "";
}

export function getPublishableSupabase() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export async function fetchMP(endpoint: string, options: RequestInit = {}) {
  const token = getMPAccessToken();
  const url = `${MP_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message ?? data?.error ?? text;
    throw new Error(`Mercado Pago erro ${res.status}: ${msg}`);
  }
  return data;
}

export function generateCouponCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "QAP-";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getPlanDuration(plan: "monthly" | "yearly"): number {
  return plan === "yearly" ? 12 : 1;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function computeProratedCredit(
  plan: "monthly" | "yearly",
  paidAmount: number,
  periodStart: Date,
  periodEnd: Date,
  now: Date,
): number {
  if (now >= periodEnd) return 0;
  const totalMs = periodEnd.getTime() - periodStart.getTime();
  const remainingMs = periodEnd.getTime() - now.getTime();
  if (totalMs <= 0) return 0;
  return Math.round((paidAmount * (remainingMs / totalMs)) * 100) / 100;
}

export function getPlanLabel(plan: "monthly" | "yearly"): string {
  return plan === "yearly" ? "Anual" : "Mensal";
}

export async function createPixPayment(
  userId: string,
  email: string,
  plan: "monthly" | "yearly",
  amount: number,
  externalRef: string,
) {
  const notificationUrl = await getWebhookUrl();
  const body = {
    transaction_amount: amount,
    description: `QAP Report - Plano ${getPlanLabel(plan)}`,
    payment_method_id: "pix",
    payer: { email: email || "cliente@qapreport.app" },
    external_reference: externalRef,
    notification_url: notificationUrl,
  };
  const data = await fetchMP("/v1/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  const qrCode = data?.point_of_interaction?.transaction_data?.qr_code ?? "";
  const qrCodeBase64 = data?.point_of_interaction?.transaction_data?.qr_code_base64 ?? "";
  const expiration = data?.point_of_interaction?.transaction_data?.expiration_date
    ? new Date(data.point_of_interaction.transaction_data.expiration_date)
    : addMonths(new Date(), 1);
  return {
    paymentId: String(data.id),
    status: data.status,
    qrCode,
    qrCodeBase64,
    expiration,
  };
}

export async function createCardPreference(
  userId: string,
  email: string,
  plan: "monthly" | "yearly",
  amount: number,
  externalRef: string,
) {
  const notificationUrl = await getWebhookUrl();
  const returnUrl = `${process.env.SITE_URL ?? "https://qap-report.lovable.app"}/settings?payment=verify`;
  const body = {
    items: [
      {
        id: `qap-${plan}`,
        title: `QAP Report - Plano ${getPlanLabel(plan)}`,
        description: `Acesso premium ao QAP Report por ${getPlanDuration(plan)} ${getPlanDuration(plan) === 1 ? "mês" : "meses"}.`,
        quantity: 1,
        currency_id: "BRL",
        unit_price: amount,
      },
    ],
    payer: { email: email || "cliente@qapreport.app" },
    external_reference: externalRef,
    notification_url: notificationUrl,
    back_urls: {
      success: returnUrl,
      failure: returnUrl,
      pending: returnUrl,
    },
    auto_return: "approved",
  };
  const data = await fetchMP("/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return {
    preferenceId: String(data.id),
    initPoint: data.init_point,
    sandboxInitPoint: data.sandbox_init_point,
  };
}

export async function processPaymentByExternalId(externalId: string) {
  const supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const data = await fetchMP(`/v1/payments/${externalId}`);
  if (!data?.id) return { ok: false, message: "Pagamento não encontrado" };

  const status = data.status;
  const externalRef = data.external_reference;
  if (!externalRef || !externalRef.startsWith("qap-")) {
    return { ok: false, message: "Referência externa inválida" };
  }

  const parts = externalRef.split("-");
  const userId = parts[2];
  const plan = parts[3] as "monthly" | "yearly";
  if (!userId || (plan !== "monthly" && plan !== "yearly")) {
    return { ok: false, message: "Plano inválido" };
  }

  const { data: existing } = await supabaseAdmin
    .from("payments")
    .select("id, status")
    .eq("external_id", String(data.id))
    .maybeSingle();

  const paymentPayload = {
    user_id: userId,
    external_id: String(data.id),
    external_payment_method_id: String(data.payment_method_id ?? ""),
    amount: Number(data.transaction_amount),
    currency: "BRL",
    status: status,
    payment_method: mapMPPaymentMethod(data.payment_type_id ?? data.payment_method_id ?? ""),
    plan: plan,
    paid_at: status === "approved" ? new Date().toISOString() : null,
  };

  let paymentId = existing?.id;
  if (existing) {
    await supabaseAdmin.from("payments").update(paymentPayload).eq("id", existing.id);
  } else {
    const { data: inserted } = await supabaseAdmin.from("payments").insert(paymentPayload).select("id").single();
    paymentId = inserted?.id;
  }

  if (status === "approved") {
    await activateSubscription(userId, plan, paymentId);
  }

  return { ok: true, status, paymentId };
}

async function activateSubscription(userId: string, plan: "monthly" | "yearly", paymentId?: string) {
  const supabaseAdmin = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("id, status, current_period_start, current_period_end, plan")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const durationMonths = getPlanDuration(plan);
  let periodStart = now;
  let periodEnd = addMonths(now, durationMonths);

  const currentPlan = sub?.plan as "monthly" | "yearly" | undefined;

  if (sub && sub.status === "active" && currentPlan === plan && new Date(sub.current_period_end) > now) {
    periodStart = new Date(sub.current_period_end);
    periodEnd = addMonths(periodStart, durationMonths);
  } else if (sub && sub.status === "active" && currentPlan && currentPlan !== plan && new Date(sub.current_period_end) > now) {
    const credit = computeProratedCredit(
      currentPlan,
      currentPlan === "yearly" ? 90 : 10,
      new Date(sub.current_period_start),
      new Date(sub.current_period_end),
      now,
    );
    const { data: priceRow } = await supabaseAdmin
      .from("app_settings")
      .select("value")
      .eq("key", plan === "yearly" ? "yearly_price" : "monthly_price")
      .single();
    const targetPrice = Number(priceRow?.value ?? (plan === "yearly" ? 90 : 10));
    if (credit >= targetPrice) {
      periodStart = new Date(sub.current_period_end);
      periodEnd = addMonths(periodStart, durationMonths);
    } else {
      periodStart = new Date(sub.current_period_end);
      periodEnd = addMonths(periodStart, durationMonths);
    }
  }

  const subPayload = {
    user_id: userId,
    status: "active" as const,
    plan: plan,
    trial_ends_at: null,
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    canceled_at: null,
    payment_method: plan === "monthly" ? ("pix" as const) : ("credit_card" as const),
  };

  if (sub) {
    await supabaseAdmin.from("subscriptions").update(subPayload).eq("id", sub.id);
  } else {
    await supabaseAdmin.from("subscriptions").insert(subPayload);
  }

  if (paymentId) {
    await supabaseAdmin.from("payments").update({ subscription_id: sub?.id }).eq("id", paymentId);
  }
}

function mapMPPaymentMethod(mpMethod: string): "pix" | "credit_card" | "debit_card" | "unknown" {
  const m = String(mpMethod).toLowerCase();
  if (m === "pix" || m === "account_money") return "pix";
  if (m === "credit_card") return "credit_card";
  if (m === "debit_card") return "debit_card";
  return "unknown";
}

async function getWebhookUrl(): Promise<string> {
  return `${process.env.SITE_URL ?? "https://qap-report.lovable.app"}/api/public/mercadopago-webhook`;
}
