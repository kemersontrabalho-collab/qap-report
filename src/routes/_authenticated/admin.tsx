import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminSetUserBlocked, adminDeleteUser, isFounder } from "@/lib/admin.functions";
import { sendNotification } from "@/lib/notifications.functions";
import { adminCreateCoupon, adminListCoupons, adminUpdatePrices, getBillingSettings } from "@/lib/billing.functions";
import { Loader2, Shield, Users, FileText, Activity, Ban, CheckCircle2, Trash2, Crown, Send, Bell, Ticket, Tag, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administração · QAP Report" }] }),
  beforeLoad: async () => {
    try {
      const { founder } = await isFounder();
      if (!founder) throw redirect({ to: "/dashboard" });
    } catch (e) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"users" | "coupons" | "pricing">("users");
  const listFn = useServerFn(adminListUsers);
  const banFn = useServerFn(adminSetUserBlocked);
  const delFn = useServerFn(adminDeleteUser);
  const listCouponsFn = useServerFn(adminListCoupons);
  const createCouponFn = useServerFn(adminCreateCoupon);
  const updatePricesFn = useServerFn(adminUpdatePrices);
  const billingFn = useServerFn(getBillingSettings);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
  });

  const { data: couponsData } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => listCouponsFn(),
  });

  const { data: billing } = useQuery({
    queryKey: ["billing-settings"],
    queryFn: () => billingFn(),
  });

  const banMut = useMutation({
    mutationFn: (v: { userId: string; block: boolean }) => banFn({ data: v }),
    onSuccess: (_r, v) => {
      toast.success(v.block ? "Usuário bloqueado" : "Usuário desbloqueado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const delMut = useMutation({
    mutationFn: (userId: string) => delFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Conta apagada permanentemente");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      </AppShell>
    );
  }

  if (isError || !data) {
    return (
      <AppShell>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Não foi possível carregar o painel."}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel do Fundador</h1>
          <p className="text-sm text-muted-foreground">Gestão exclusiva de usuários e estatísticas.</p>
        </div>
      </div>

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Usuários cadastrados" value={data.stats.totalUsers} />
        <Stat icon={Activity} label="Ativos (30 dias)" value={data.stats.activeUsers30d} />
        <Stat icon={FileText} label="Boletins criados" value={data.stats.totalBulletins} />
      </section>

      <NotificationComposer users={data.users} />

      <div className="mb-4 flex gap-2 border-b pb-1">
        <TabButton active={tab === "users"} onClick={() => setTab("users")} icon={Users} label="Usuários" />
        <TabButton active={tab === "coupons"} onClick={() => setTab("coupons")} icon={Ticket} label="Cupons" />
        <TabButton active={tab === "pricing"} onClick={() => setTab("pricing")} icon={Tag} label="Preços" />
      </div>

      {tab === "users" && (
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="border-b p-4">
            <h2 className="font-semibold">Usuários</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.users.length} conta{data.users.length === 1 ? "" : "s"} no sistema.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Nome</th>
                  <th className="px-4 py-2 text-right">Boletins</th>
                  <th className="px-4 py-2">Último acesso</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.users.map((u) => {
                  const blocked = u.banned_until && new Date(u.banned_until).getTime() > Date.now();
                  return (
                    <tr key={u.id} className="hover:bg-accent/30">
                      <td className="px-4 py-2 font-mono text-xs">
                        <div className="flex items-center gap-1.5">
                          {u.is_founder && <Crown className="h-3.5 w-3.5 text-warning" />}
                          {u.email ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-2">{u.full_name ?? "—"}</td>
                      <td className="px-4 py-2 text-right">{u.bulletin_count}</td>
                      <td className="px-4 py-2 text-xs text-muted-foreground">
                        {u.last_sign_in_at
                          ? new Date(u.last_sign_in_at).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "Nunca"}
                      </td>
                      <td className="px-4 py-2">
                        {blocked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            <Ban className="h-3 w-3" /> Bloqueado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            <CheckCircle2 className="h-3 w-3" /> Ativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex justify-end gap-1">
                          {!u.is_founder && (
                            <>
                              <button
                                disabled={banMut.isPending}
                                onClick={() => {
                                  const next = !blocked;
                                  if (
                                    next &&
                                    !confirm(`Bloquear o usuário ${u.email}? Ele não conseguirá mais entrar.`)
                                  )
                                    return;
                                  banMut.mutate({ userId: u.id, block: next });
                                }}
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60"
                              >
                                {blocked ? <CheckCircle2 className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                                {blocked ? "Desbloquear" : "Bloquear"}
                              </button>
                              <button
                                disabled={delMut.isPending}
                                onClick={() => {
                                  if (!confirm(`Apagar permanentemente ${u.email} e todos os seus dados?`)) return;
                                  if (!confirm("Confirme novamente. Esta ação é irreversível.")) return;
                                  delMut.mutate(u.id);
                                }}
                                className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-60"
                              >
                                <Trash2 className="h-3 w-3" /> Apagar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "coupons" && <CouponsManager couponsData={couponsData} createCouponFn={createCouponFn} />}
      {tab === "pricing" && <PricingManager billing={billing} updatePricesFn={updatePricesFn} />}
    </AppShell>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium ${
        active ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );
}

function CouponsManager({
  couponsData,
  createCouponFn,
}: {
  couponsData: { coupons: unknown[] } | undefined;
  createCouponFn: ReturnType<typeof useServerFn<typeof adminCreateCoupon>>;
}) {
  const qc = useQueryClient();
  const [duration, setDuration] = useState<1 | 12>(1);
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");

  const createMut = useMutation({
    mutationFn: () =>
      createCouponFn({
        data: {
          durationMonths: duration,
          maxUses,
          expiresAt: expiresAt || undefined,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Cupom ${res.code} gerado`);
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const coupons = (couponsData?.coupons ?? []) as Array<{
    id: string;
    code: string;
    duration_months: number;
    max_uses: number;
    used_count: number;
    active: boolean;
    expires_at: string | null;
    coupon_redemptions: Array<{ user_id: string; redeemed_at: string }>;
  }>;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Gerar novo cupom</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cupons dão acesso premium ao usuário que os resgatar. Cada código pode ser de uso único por pessoa.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Duração</span>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) as 1 | 12)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value={1}>1 mês grátis</option>
              <option value={12}>1 ano grátis</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Limite de usos</span>
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value)))}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Expira em (opcional)</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          onClick={() => createMut.mutate()}
          disabled={createMut.isPending}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
          Gerar cupom
        </button>
      </div>

      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-semibold">Cupons criados</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Duração</th>
                <th className="px-3 py-2">Usos</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Resgatado por</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {coupons.map((c) => {
                const exhausted = c.used_count >= c.max_uses;
                const expired = c.expires_at ? new Date(c.expires_at) < new Date() : false;
                return (
                  <tr key={c.id} className="hover:bg-accent/30">
                    <td className="px-3 py-2 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        {c.code}
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(c.code);
                            toast.success("Código copiado");
                          }}
                          className="rounded border px-1.5 py-0.5 text-[10px] hover:bg-accent"
                        >
                          Copiar
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {c.duration_months} {c.duration_months === 1 ? "mês" : "meses"}
                    </td>
                    <td className="px-3 py-2">
                      {c.used_count}/{c.max_uses}
                    </td>
                    <td className="px-3 py-2">
                      {!c.active || expired || exhausted ? (
                        <span className="text-xs text-destructive">Inativo</span>
                      ) : (
                        <span className="text-xs text-success">Ativo</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {c.coupon_redemptions.length === 0
                        ? "Não resgatado"
                        : c.coupon_redemptions
                            .map((r) => `${r.user_id.slice(0, 8)} em ${new Date(r.redeemed_at).toLocaleDateString("pt-BR")}`)
                            .join("; ")}
                    </td>
                  </tr>
                );
              })}
              {coupons.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-sm text-muted-foreground" colSpan={5}>
                    Nenhum cupom criado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function PricingManager({
  billing,
  updatePricesFn,
}: {
  billing: { monthlyPrice: number; yearlyPrice: number } | undefined;
  updatePricesFn: ReturnType<typeof useServerFn<typeof adminUpdatePrices>>;
}) {
  const qc = useQueryClient();
  const [monthly, setMonthly] = useState(billing?.monthlyPrice ?? 10);
  const [yearly, setYearly] = useState(billing?.yearlyPrice ?? 90);

  const updateMut = useMutation({
    mutationFn: () => updatePricesFn({ data: { monthlyPrice: monthly, yearlyPrice: yearly } }),
    onSuccess: () => {
      toast.success("Preços atualizados");
      qc.invalidateQueries({ queryKey: ["billing-settings"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="font-semibold">Preços dos planos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Alterações só valem para novas assinaturas ou renovações. Planos ativos mantêm o valor original até o fim do ciclo.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Plano mensal (R$)</span>
          <input
            type="number"
            min={1}
            step={0.01}
            value={monthly}
            onChange={(e) => setMonthly(Number(e.target.value))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Plano anual (R$)</span>
          <input
            type="number"
            min={1}
            step={0.01}
            value={yearly}
            onChange={(e) => setYearly(Number(e.target.value))}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>
      <button
        onClick={() => updateMut.mutate()}
        disabled={updateMut.isPending}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {updateMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Salvar preços
      </button>
    </section>
  );
}

function NotificationComposer({ users }: { users: Array<{ id: string; email: string | null; full_name: string | null }> }) {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendNotification);
  const [audience, setAudience] = useState<"all" | "user">("all");
  const [targetId, setTargetId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const mut = useMutation({
    mutationFn: () =>
      sendFn({
        data: {
          title: title.trim(),
          body: body.trim(),
          audience,
          target_user_id: audience === "user" ? targetId : null,
        },
      }),
    onSuccess: () => {
      toast.success("Notificação enviada");
      setTitle("");
      setBody("");
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (audience === "all" || targetId.length > 0);

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-semibold">Enviar notificação</h2>
          <p className="text-xs text-muted-foreground">
            Publique um aviso para todos os usuários ou para um usuário específico.
          </p>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">Destino</span>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as "all" | "user")}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os usuários</option>
              <option value="user">Usuário específico</option>
            </select>
          </label>
          {audience === "user" && (
            <label className="text-sm">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Usuário</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecione…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name ? `${u.full_name} — ` : ""}
                    {u.email ?? u.id}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Título</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={140}
            placeholder="Ex.: Atualização do aplicativo v1.2"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Mensagem</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Descreva o que foi atualizado ou o aviso enviado aos operadores."
            className="w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="flex justify-end">
          <button
            onClick={() => mut.mutate()}
            disabled={!canSend || mut.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {mut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar notificação
          </button>
        </div>
      </div>
    </section>
  );
}
