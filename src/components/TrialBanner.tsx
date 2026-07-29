import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Clock, Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { getMySubscriptionStatus } from "@/lib/subscription.functions";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0h 00min";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

/**
 * Aviso fixo no topo do painel:
 * - Trial ativo: mostra tempo restante das 24h de teste.
 * - Trial expirado sem plano: mostra "Seu tempo de teste ACABOU".
 * - Plano ativo/vitalício: não renderiza nada.
 */
export function TrialBanner() {
  const statusFn = useServerFn(getMySubscriptionStatus);
  const { data } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => statusFn(),
    staleTime: 60_000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const sub = data?.subscription;
  if (!sub) return null;

  const endMs = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;

  // Plano pago vigente — nada a exibir.
  if (
    (sub.status === "active" || sub.plan === "vitalicio") &&
    sub.plan !== "free" &&
    (!endMs || endMs > now)
  ) {
    return null;
  }

  // Trial ainda válido.
  if (sub.status === "trial" && endMs && endMs > now) {
    return (
      <div className="mb-4 flex flex-col gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Período de teste gratuito ativo
            </p>
            <p className="text-xs text-muted-foreground">
              Tempo restante: <span className="font-medium text-foreground">{formatRemaining(endMs - now)}</span>. Assine para não perder acesso.
            </p>
          </div>
        </div>
        <Link
          to="/assinar"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          <Crown className="h-4 w-4" />
          Assinar agora
        </Link>
      </div>
    );
  }

  // Trial acabou (ou plano expirado) e ainda não há plano ativo.
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-destructive">
            Seu tempo de teste ACABOU
          </p>
          <p className="text-xs text-muted-foreground">
            Criação de boletins e chat de dúvidas foram bloqueados. Assine um plano
            ou resgate um código promocional em Configurações para reativar.
          </p>
        </div>
      </div>
      <Link
        to="/assinar"
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:opacity-90"
      >
        <Crown className="h-4 w-4" />
        Assinar / Cupom
      </Link>
    </div>
  );
}
