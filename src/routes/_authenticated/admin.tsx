import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminListUsers, adminSetUserBlocked, adminDeleteUser, isFounder } from "@/lib/admin.functions";
import { sendNotification } from "@/lib/notifications.functions";
import { Loader2, Shield, Users, FileText, Activity, Ban, CheckCircle2, Trash2, Crown, Send, Bell } from "lucide-react";
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
  const listFn = useServerFn(adminListUsers);
  const banFn = useServerFn(adminSetUserBlocked);
  const delFn = useServerFn(adminDeleteUser);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => listFn(),
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
