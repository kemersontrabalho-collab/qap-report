import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getMySubscriptionStatus,
  createPixRequest,
  cancelPixRequest,
  redeemCoupon,
} from "@/lib/subscription.functions";
import { supabase } from "@/integrations/supabase/client";

import {
  Loader2,
  CheckCircle2,
  Copy,
  Ticket,
  QrCode,
  MessageCircle,
  ArrowLeft,
  Clock,
  Crown,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/assinar")({
  head: () => ({
    meta: [
      { title: "Assinar QAP Report" },
      {
        name: "description",
        content:
          "Ative seu plano mensal do QAP Report — código promocional ou pagamento via Pix com liberação imediata.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AssinarPage,
});

// ============================================================
// Constantes de negócio (centralizadas p/ facilitar troca)
// ============================================================
const PIX_KEY = "dc748121-4fd1-4277-b987-7b4b5aa2de0f";
const WHATSAPP_NUMBER = "5555997153371"; // 55 (país) + 55 (DDD) + 997153371
const WHATSAPP_FULL = "5555997153371";
const PLANS = {
  mensal: { label: "Mensal", price: 1.99, priceLabel: "R$ 1,99", cycle: "por mês" },
} as const;
type PlanId = keyof typeof PLANS;


// ============================================================
type Step = "plans" | "hasCoupon" | "coupon" | "pix";

function AssinarPage() {
  const qc = useQueryClient();
  const statusFn = useServerFn(getMySubscriptionStatus);
  const { data: status, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => statusFn(),
  });

  const [step, setStep] = useState<Step>("plans");
  const [plan, setPlan] = useState<PlanId>("mensal");

  const pendingPix = status?.pendingPix ?? null;
  const sub = status?.subscription ?? null;

  const activePlan = useMemo(() => {
    if (!sub) return null;
    const end = sub.current_period_end ? new Date(sub.current_period_end) : null;
    const now = new Date();
    if (sub.status === "active" && end && end.getTime() > now.getTime()) {
      return {
        plan: sub.plan,
        endsAt: end,
        lifetime: sub.plan === "vitalicio",
      };
    }
    return null;
  }, [sub]);

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Assinatura QAP Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Libere todas as funcionalidades do assistente de redação policial.
          </p>
        </div>

        {(() => {
          // Aviso destacado quando o trial acabou e ainda não há plano ativo.
          const endMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
          const trialExpired =
            !activePlan &&
            (!sub || sub.plan === "free" || sub.status === "trial") &&
            endMs !== null &&
            endMs <= Date.now();
          if (!trialExpired) return null;
          return (
            <section className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <h2 className="text-base font-bold uppercase tracking-wide text-destructive">
                    Seu tempo de teste ACABOU
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    A criação de boletins e o chat de dúvidas estão bloqueados. Escolha um plano
                    abaixo ou resgate um código promocional para reativar todas as funções do QAP
                    Report.
                  </p>
                </div>
              </div>
            </section>
          );
        })()}

        {activePlan && (
          <section className="rounded-2xl border bg-emerald-500/5 border-emerald-500/40 p-5">
            <div className="flex items-start gap-3">
              <Crown className="mt-1 h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="font-semibold text-emerald-700 dark:text-emerald-300">
                  Assinatura ativa: {activePlan.plan}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {activePlan.lifetime
                    ? "Acesso vitalício — sem data de expiração."
                    : `Válida até ${activePlan.endsAt.toLocaleDateString("pt-BR")}.`}
                </p>
              </div>
            </div>
          </section>
        )}

        {pendingPix && step === "plans" && (
          <PendingPixCard
            pendingPix={pendingPix}
            onCanceled={() => qc.invalidateQueries({ queryKey: ["my-subscription"] })}
          />
        )}

        {/* Fluxo passo-a-passo */}
        {step === "plans" && (
          <PlanSelector
            selected={plan}
            onSelect={(p) => {
              setPlan(p);
              setStep("hasCoupon");
            }}
          />
        )}

        {step === "hasCoupon" && (
          <HasCouponStep
            onBack={() => setStep("plans")}
            onYes={() => setStep("coupon")}
            onNo={() => setStep("pix")}
          />
        )}

        {step === "coupon" && (
          <CouponStep
            onBack={() => setStep("hasCoupon")}
            onRedeemed={() => {
              qc.invalidateQueries({ queryKey: ["my-subscription"] });
              setStep("plans");
            }}
          />
        )}

        {step === "pix" && (
          <PixStep
            plan={plan}
            onBack={() => setStep("hasCoupon")}
            onDone={() => {
              qc.invalidateQueries({ queryKey: ["my-subscription"] });
              setStep("plans");
            }}
          />
        )}
      </div>
    </AppShell>
  );
}

// ============================================================
function PlanSelector({ selected, onSelect }: { selected: PlanId; onSelect: (p: PlanId) => void }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Escolha seu plano</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          const active = selected === id;
          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`rounded-2xl border p-5 text-left transition ${
                active ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <p className="text-sm text-muted-foreground">Plano {p.label}</p>
              <p className="mt-1 text-2xl font-bold">{p.priceLabel}</p>
              <p className="text-xs text-muted-foreground">{p.cycle}</p>
              <div className="mt-3 flex items-center gap-2 text-sm font-medium text-primary">
                Continuar <ArrowLeft className="h-4 w-4 rotate-180" />
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
function HasCouponStep({
  onBack,
  onYes,
  onNo,
}: {
  onBack: () => void;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5">
      <BackBtn onClick={onBack} />
      <h2 className="mt-2 text-lg font-semibold">Você possui um código de resgate?</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Códigos promocionais liberam sua assinatura na hora, sem cobrança.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          onClick={onYes}
          className="flex items-center gap-2 rounded-lg border p-4 text-left hover:bg-accent"
        >
          <Ticket className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Sim, tenho um código</p>
            <p className="text-xs text-muted-foreground">Digite o código na próxima tela</p>
          </div>
        </button>
        <button
          onClick={onNo}
          className="flex items-center gap-2 rounded-lg border p-4 text-left hover:bg-accent"
        >
          <QrCode className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">Não, quero pagar com Pix</p>
            <p className="text-xs text-muted-foreground">
              Liberação após confirmação do comprovante
            </p>
          </div>
        </button>
      </div>
    </section>
  );
}

// ============================================================
function CouponStep({ onBack, onRedeemed }: { onBack: () => void; onRedeemed: () => void }) {
  const redeemFn = useServerFn(redeemCoupon);
  const [rawCode, setRawCode] = useState("");
  const clean = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

  const mut = useMutation({
    mutationFn: () => redeemFn({ data: { code: clean } }),
    onSuccess: (res) => {
      if (res.grants_lifetime) {
        toast.success("Código validado — acesso vitalício liberado!");
      } else {
        toast.success(`Código validado — ${res.duration_months} mês(es) adicionados à sua conta.`);
      }
      onRedeemed();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="rounded-2xl border bg-card p-5">
      <BackBtn onClick={onBack} />
      <h2 className="mt-2 text-lg font-semibold">Digite seu código de resgate</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Use apenas letras e números. Espaços e símbolos são ignorados automaticamente.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (clean.length < 4) {
            toast.error("Código muito curto.");
            return;
          }
          mut.mutate();
        }}
        className="mt-4 space-y-3"
      >
        <input
          value={rawCode}
          onChange={(e) => setRawCode(e.target.value)}
          placeholder="EX: QAPFREE30"
          maxLength={40}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          className="input font-mono tracking-widest text-lg uppercase"
        />
        {rawCode && clean !== rawCode && (
          <p className="text-xs text-muted-foreground">
            Será validado como: <span className="font-mono">{clean}</span>
          </p>
        )}
        <button
          type="submit"
          disabled={mut.isPending || clean.length < 4}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {mut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Validar código
        </button>
      </form>
    </section>
  );
}

// ============================================================
function PixStep({
  plan,
  onBack,
  onDone,
}: {
  plan: PlanId;
  onBack: () => void;
  onDone: () => void;
}) {
  const p = PLANS[plan];
  const createFn = useServerFn(createPixRequest);
  const [phase, setPhase] = useState<"initial" | "waiting">("initial");
  const [requestId, setRequestId] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => createFn({ data: { plan } }),
    onSuccess: (res) => {
      setRequestId(res.request_id);
      if (res.already_pending) {
        toast.info("Seu pagamento já está em análise.");
      } else {
        toast.success("Pagamento registrado. Envie o comprovante para liberação imediata.");
      }
      setPhase("waiting");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copyKey() {
    try {
      await navigator.clipboard.writeText(PIX_KEY);
      toast.success("Chave Pix copiada!");
    } catch {
      toast.error("Não foi possível copiar. Selecione manualmente.");
    }
  }

  async function openWhatsApp() {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? "(email não disponível)";
    const msg = `Olá, fiz o pagamento do plano ${p.label} (${p.priceLabel}) do app QAP Report. Meu e-mail é ${email} e segue o comprovante.`;
    const url = `https://wa.me/${WHATSAPP_FULL}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <BackBtn onClick={onBack} disabled={phase === "waiting"} />
      <h2 className="mt-2 text-lg font-semibold">Pagamento via Pix — Plano {p.label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Copie a chave, faça o Pix no valor exato e clique em "Já fiz o pagamento".
      </p>

      <div className="mt-4 rounded-xl border bg-muted/40 p-4">
        <p className="text-xs uppercase text-muted-foreground">Valor exato</p>
        <p className="text-2xl font-bold">{p.priceLabel}</p>
      </div>

      <div className="mt-3 rounded-xl border bg-muted/40 p-4">
        <p className="text-xs uppercase text-muted-foreground">
          Chave Pix aleatória (Mercado Pago)
        </p>
        <p className="mt-1 break-all font-mono text-sm">{PIX_KEY}</p>
        <button
          onClick={copyKey}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Copy className="h-4 w-4" /> Copiar Chave Pix
        </button>
      </div>

      {phase === "initial" ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Já fiz o pagamento
          </button>
          <button
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm hover:bg-accent"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Seu pagamento está em análise.</p>
              <p className="mt-1 text-xs">
                Envie o comprovante pelo WhatsApp para acelerar a liberação. A aprovação é feita
                pelo administrador.
              </p>
            </div>
          </div>
          <button
            onClick={openWhatsApp}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
            Enviar comprovante via WhatsApp
          </button>
          <button
            onClick={onDone}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm hover:bg-accent"
          >
            Voltar ao início
          </button>
        </div>
      )}
    </section>
  );
}

// ============================================================
function PendingPixCard({
  pendingPix,
  onCanceled,
}: {
  pendingPix: { id: string; plan: string; amount_brl: number; created_at: string };
  onCanceled: () => void;
}) {
  const cancelFn = useServerFn(cancelPixRequest);
  const mut = useMutation({
    mutationFn: () => cancelFn({ data: { requestId: pendingPix.id } }),
    onSuccess: () => {
      toast.success("Solicitação cancelada.");
      onCanceled();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <section className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
      <div className="flex items-start gap-3">
        <Clock className="mt-1 h-5 w-5 text-amber-600" />
        <div className="flex-1">
          <h2 className="font-semibold">Pagamento em análise</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Você já enviou uma solicitação do plano <strong>{pendingPix.plan}</strong> (R${" "}
            {Number(pendingPix.amount_brl).toFixed(2).replace(".", ",")}) em{" "}
            {new Date(pendingPix.created_at).toLocaleString("pt-BR")}. Aguarde a confirmação do
            administrador ou envie o comprovante pelo WhatsApp.
          </p>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending}
            className="mt-3 text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-60"
          >
            Cancelar esta solicitação
          </button>
        </div>
      </div>
    </section>
  );
}

// ============================================================
function BackBtn({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      <ArrowLeft className="h-3 w-3" /> Voltar
    </button>
  );
}
