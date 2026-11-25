export type SubscriptionOrigin = "pago" | "admin" | "cupom" | "teste" | "sem_plano";

export type OriginInput = {
  sub: { plan: string; status: string; end: string | null; payment_method: string | null } | null;
  redeemedCoupon: boolean;
  now?: number;
};

/** Classifica de onde veio o acesso do usuário para o painel do administrador. */
export function subscriptionOrigin({ sub, redeemedCoupon, now = Date.now() }: OriginInput): SubscriptionOrigin {
  if (!sub || !sub.end || new Date(sub.end).getTime() <= now) return "sem_plano";
  if (sub.plan === "free") return sub.status === "trial" ? "teste" : "sem_plano";
  if (sub.status !== "active" && sub.status !== "canceled") return "sem_plano";
  if (sub.payment_method === "pix") return "pago";
  if (sub.payment_method === "cupom" || redeemedCoupon) return "cupom";
  return "admin";
}

export const ORIGIN_LABEL: Record<SubscriptionOrigin, string> = {
  pago: "Pago (Pix)",
  admin: "Cortesia do Adm",
  cupom: "Cupom",
  teste: "Teste grátis",
  sem_plano: "Sem plano ativo",
};