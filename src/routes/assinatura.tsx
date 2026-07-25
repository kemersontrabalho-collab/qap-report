import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getBillingSettings, getMySubscription, createCheckout, redeemCoupon, cancelSubscription, getSubscriptionStatus } from "@/lib/billing.functions";
import { Loader2, CheckCircle2, CreditCard, QrCode, Calendar, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/assinatura")({
  head: () => ({ meta: [{ title: "Assinatura · QAP Report" }] }),
  ssr: false,
  beforeLoad: async () => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isFounder } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "fundador" });
    if (isFounder) throw redirect({ to: "/dashboard" });
    return { user: data.user };
  },
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const billingFn = useServerFn(getBillingSettings);
  const subFn = useServerFn(getMySubscription);
  const checkoutFn = useServerFn(createCheckout);
  const couponFn = useServerFn(redeemCoupon);
  const cancelFn = useServerFn(cancelSubscription);
  const statusFn = useServerFn(getSubscriptionStatus);

  const { data: status } = useQuery({ queryKey: ["subscription-status"], queryFn: () => statusFn() });
  useEffect(() => {
    if (status?.isFounder) navigate({ to: "/dashboard", replace: true });
  }, [status?.isFounder, navigate]);


  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ["billing-settings"],
    queryFn: () => billingFn(),
  });
  const { data: mySub, isLoading: subLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => subFn(),
  });

  const [plan, setPlan] = useState<"monthly" | "yearly">("monthly");
  const [coupon, setCoupon] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pixResult, setPixResult] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64: string;
    expiration: Date;
  } | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);

  const checkoutMut = useMutation({
    mutationFn: (vars: { paymentMethod: "pix" | "card"; couponCode?: string }) =>
      checkoutFn({ data: { plan, paymentMethod: vars.paymentMethod, couponCode: vars.couponCode } }),
    onSuccess: (res) => {
      if (res.type === "coupon") {
        toast.success(`Cupom resgatado: ${res.durationMonths} ${res.durationMonths === 1 ? "mês" : "meses"} grátis`);
        qc.invalidateQueries({ queryKey: ["my-subscription"] });
        qc.invalidateQueries({ queryKey: ["subscription-status"] });
      } else if (res.type === "pix") {
        setPixResult({
          paymentId: res.paymentId,
          qrCode: res.qrCode,
          qrCodeBase64: res.qrCodeBase64,
          expiration: res.expiration,
        });
        setCardUrl(null);
      } else if (res.type === "card") {
        setCardUrl(res.initPoint);
        setPixResult(null);
        window.open(res.initPoint, "_blank");
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro no checkout"),
  });

  const cancelMut = useMutation({
    mutationFn: () => cancelFn(),
    onSuccess: (res) => {
      toast.success(`Acesso mantido até ${new Date(res.validUntil).toLocaleDateString("pt-BR")}`);
      qc.invalidateQueries({ queryKey: ["my-subscription"] });
      qc.invalidateQueries({ queryKey: ["subscription-status"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao cancelar"),
  });

  const sub = mySub?.subscription;
  const isActive = sub && (sub.status === "active" || sub.status === "trial");
  const isExpired = !isActive || (sub?.current_period_end && new Date(sub.current_period_end) < new Date());
  const daysLeft = sub?.current_period_end
    ? Math.max(0, Math.ceil((new Date(sub.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const canCheckout = accepted && !checkoutMut.isPending;

  if (status?.isFounder) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecionando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Sua assinatura</h1>
          <p className="text-sm text-muted-foreground">Gerencie seu plano e formas de pagamento.</p>
        </div>

        {subLoading || billingLoading ? (

          <div className="flex items-center justify-center py-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Plano atual</div>
                  <div className="font-semibold">
                    {sub?.status === "trial" && "Teste grátis de 7 dias"}
                    {sub?.status === "active" && `${sub.plan === "yearly" ? "Anual" : "Mensal"}`}
                    {(!sub || sub.status === "expired" || sub.status === "canceled") && "Sem plano ativo"}
                  </div>
                </div>
              </div>
              {sub?.current_period_end && (
                <div className="mt-4 rounded-lg bg-muted/40 p-3 text-sm">
                  {isExpired ? (
                    <span className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-4 w-4" /> Plano expirado em{" "}
                      {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                    </span>
                  ) : (
                    <span>
                      Acesso até{" "}
                      <strong>{new Date(sub.current_period_end).toLocaleDateString("pt-BR")}</strong>
                      {daysLeft > 0 && ` (${daysLeft} ${daysLeft === 1 ? "dia" : "dias"} restantes)`}
                    </span>
                  )}
                </div>
              )}
              {sub?.status === "canceled" && sub?.current_period_end && !isExpired && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Renovação cancelada. O acesso continua até o fim do período pago.
                </div>
              )}
              {isActive && !isExpired && (
                <button
                  onClick={() => {
                    if (confirm("Cancelar renovação? O acesso continua até o fim do período pago.")) {
                      cancelMut.mutate();
                    }
                  }}
                  disabled={cancelMut.isPending}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  {cancelMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertCircle className="h-4 w-4" />}
                  Cancelar renovação
                </button>
              )}
            </section>

            {!isActive && (
              <>
                <section className="mb-6 rounded-2xl border bg-card p-5">
                  <h2 className="mb-3 font-semibold">Escolha um plano</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <PlanCard
                      selected={plan === "monthly"}
                      onClick={() => setPlan("monthly")}
                      title="Mensal"
                      price={billing?.monthlyPrice ?? 10}
                      period="/mês"
                    />
                    <PlanCard
                      selected={plan === "yearly"}
                      onClick={() => setPlan("yearly")}
                      title="Anual"
                      price={billing?.yearlyPrice ?? 90}
                      period="/ano"
                      badge="Economize"
                    />
                  </div>
                </section>

                <section className="mb-6 rounded-2xl border bg-card p-5">
                  <h2 className="mb-3 font-semibold">Cupom</h2>
                  <div className="flex gap-2">
                    <input
                      value={coupon}
                      onChange={(e) => setCoupon(e.target.value)}
                      placeholder="Código do cupom"
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => {
                        if (!coupon.trim()) return;
                        checkoutMut.mutate({ paymentMethod: "pix", couponCode: coupon.trim() });
                      }}
                      disabled={!coupon.trim() || checkoutMut.isPending}
                      className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Caso o cupom seja válido, o acesso é liberado sem pagamento.</p>
                </section>

                <section className="mb-6 rounded-2xl border bg-card p-5">
                  <h2 className="mb-3 font-semibold">Termo de aceite</h2>
                  <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
                    <pre className="whitespace-pre-wrap font-sans">{billing?.terms}</pre>
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={accepted}
                      onChange={(e) => setAccepted(e.target.checked)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <span>Li e concordo com os termos acima.</span>
                  </label>
                </section>

                <section className="mb-6 grid gap-3">
                  <button
                    onClick={() => checkoutMut.mutate({ paymentMethod: "pix" })}
                    disabled={!canCheckout}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {checkoutMut.isPending && checkoutMut.variables?.paymentMethod === "pix" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <QrCode className="h-4 w-4" />
                    )}
                    Pagar com PIX
                  </button>
                  <button
                    onClick={() => checkoutMut.mutate({ paymentMethod: "card" })}
                    disabled={!canCheckout}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium hover:bg-accent disabled:opacity-50"
                  >
                    {checkoutMut.isPending && checkoutMut.variables?.paymentMethod === "card" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4" />
                    )}
                    Pagar com cartão
                  </button>
                </section>

                {pixResult && (
                  <section className="mb-6 rounded-2xl border bg-card p-5">
                    <h2 className="mb-3 font-semibold">Pagamento via PIX</h2>
                    <p className="mb-3 text-sm text-muted-foreground">Escaneie o QR code ou use o copia-e-cola.</p>
                    {pixResult.qrCodeBase64 && (
                      <img
                        src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="mx-auto mb-3 h-48 w-48 rounded-lg border object-contain"
                      />
                    )}
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={pixResult.qrCode}
                        className="flex-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(pixResult.qrCode);
                          toast.success("Copia-e-cola copiado");
                        }}
                        className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-accent"
                      >
                        Copiar
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Expira em {new Date(pixResult.expiration).toLocaleString("pt-BR")}. A página é atualizada automaticamente após aprovação.
                    </p>
                  </section>
                )}

                {cardUrl && (
                  <section className="mb-6 rounded-2xl border border-success/30 bg-success/5 p-5">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Redirecionamento para pagamento seguro</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Acesse o checkout do Mercado Pago para finalizar com cartão.
                    </p>
                    <a
                      href={cardUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                    >
                      <CreditCard className="h-4 w-4" /> Abrir checkout
                    </a>
                  </section>
                )}
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function PlanCard({
  selected,
  onClick,
  title,
  price,
  period,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  price: number;
  period: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition ${
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-accent/30"
      }`}
    >
      {badge && (
        <span className="absolute right-2 top-2 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
          {badge}
        </span>
      )}
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">
        {price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </div>
      <div className="text-xs text-muted-foreground">{period}</div>
    </button>
  );
}
