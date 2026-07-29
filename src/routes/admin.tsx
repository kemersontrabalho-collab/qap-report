import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  adminLogin,
  adminLogout,
  adminSessionStatus,
} from "@/lib/admin-gate.functions";
import {
  adminGetStats,
  adminListUsers,
  adminSetUserBlocked,
  adminDeleteUser,
  adminSendNotification,
  adminListCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
  adminGrantSubscription,
  adminListPixRequests,
  adminApprovePixRequest,
  adminRejectPixRequest,
} from "@/lib/admin.functions";
import {
  adminListErrorLogs,
  adminGetErrorStats,
  adminResolveErrorLog,
  adminClearResolvedLogs,
} from "@/lib/monitoring.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, LogOut, Shield, UserX, Trash2, Send, Ticket, Gift, AlertTriangle, CheckCircle2, RefreshCcw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel Administrativo — QAP Report" },
      { name: "description", content: "Painel administrativo interno do QAP Report para gestão de usuários, cupons, notificações e monitoramento da plataforma." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPanel,
});

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#84cc16"];

function AdminPanel() {
  const sessionFn = useServerFn(adminSessionStatus);
  const { data: session, isLoading } = useQuery({
    queryKey: ["admin-session"],
    queryFn: () => sessionFn(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session?.unlocked) return <LoginView />;
  return <DashboardView />;
}

function LoginView() {
  const qc = useQueryClient();
  const login = useServerFn(adminLogin);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await login({ data: { username, password } });
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["admin-session"] });
        toast.success("Bem-vindo ao painel");
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Painel Administrativo</CardTitle>
          <p className="text-sm text-muted-foreground">QAP Report — acesso restrito</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="u">Usuário</Label>
              <Input id="u" type="email" placeholder="seu-email@exemplo.com" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
            </div>
            <div>
              <Label htmlFor="p">Senha</Label>
              <Input id="p" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardView() {
  const qc = useQueryClient();
  const router = useRouter();
  const logout = useServerFn(adminLogout);

  async function handleLogout() {
    await logout();
    await qc.invalidateQueries({ queryKey: ["admin-session"] });
    router.navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Painel Administrativo</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="stats">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="stats">Dashboard</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="coupons">Cupons</TabsTrigger>
          </TabsList>
          <TabsContent value="stats" className="mt-6"><StatsPanel /></TabsContent>
          <TabsContent value="monitoring" className="mt-6"><MonitoringPanel /></TabsContent>
          <TabsContent value="users" className="mt-6"><UsersPanel /></TabsContent>
          <TabsContent value="notifications" className="mt-6"><NotifPanel /></TabsContent>
          <TabsContent value="coupons" className="mt-6"><CouponsPanel /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}


function StatsPanel() {
  const fn = useServerFn(adminGetStats);
  const { data, isLoading } = useQuery({ queryKey: ["admin-stats"], queryFn: () => fn() });
  if (isLoading || !data) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Usuários" value={data.users} />
        <StatCard label="Boletins" value={data.bulletins} />
        <StatCard label="Assinaturas ativas" value={data.activeSubscriptions} />
        <StatCard label="Notificações enviadas" value={data.notifications} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Boletins por dia (últimos 14)</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.byDay}>
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Categorias mais usadas</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byCategory} dataKey="count" nameKey="name" outerRadius={80}>
                  {data.byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Horários de pico</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byHour}>
                <XAxis dataKey="hour" fontSize={10} interval={2} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListUsers);
  const blockFn = useServerFn(adminSetUserBlocked);
  const delFn = useServerFn(adminDeleteUser);
  const grantFn = useServerFn(adminGrantSubscription);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "blocked" | "active" | "inactive">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, filter],
    queryFn: () => listFn({ data: { search, filter } }),
  });

  const block = useMutation({
    mutationFn: (v: { userId: string; blocked: boolean }) => blockFn({ data: v }),
    onSuccess: () => {
      toast.success("Usuário atualizado");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (userId: string) => delFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("Usuário excluído");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grant = useMutation({
    mutationFn: (v: { userId: string; plan: "premium" | "vitalicio"; months?: number }) =>
      grantFn({ data: v }),
    onSuccess: () => {
      toast.success("Assinatura concedida");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input placeholder="Buscar por email ou nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos (30d)</SelectItem>
            <SelectItem value="inactive">Inativos (30d+)</SelectItem>
            <SelectItem value="blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{data?.users.length ?? 0} usuário(s)</p>
          {data?.users.map((u) => (
            <Card key={u.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{u.full_name || "(sem nome)"}</p>
                    {u.blocked && <Badge variant="destructive">Bloqueado</Badge>}
                    {u.subscription && (
                      <Badge variant="secondary">{u.subscription.plan} · {u.subscription.status}</Badge>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.bulletins} boletins ·{" "}
                    {u.last_sign_in_at
                      ? `último acesso ${new Date(u.last_sign_in_at).toLocaleDateString("pt-BR")}`
                      : "nunca acessou"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><Gift className="mr-1 h-4 w-4" /> Premium</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Conceder assinatura</DialogTitle></DialogHeader>
                      <div className="space-y-3 py-2">
                        <p className="text-sm text-muted-foreground">{u.email}</p>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" onClick={() => grant.mutate({ userId: u.id, plan: "premium", months: 1 })}>1 mês</Button>
                          <Button variant="outline" onClick={() => grant.mutate({ userId: u.id, plan: "premium", months: 3 })}>3 meses</Button>
                          <Button variant="outline" onClick={() => grant.mutate({ userId: u.id, plan: "premium", months: 12 })}>12 meses</Button>
                          <Button onClick={() => grant.mutate({ userId: u.id, plan: "vitalicio" })}>Vitalício</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" size="sm" onClick={() => block.mutate({ userId: u.id, blocked: !u.blocked })}>
                    <UserX className="mr-1 h-4 w-4" />
                    {u.blocked ? "Desbloquear" : "Bloquear"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => confirm(`Excluir ${u.email}? Esta ação é permanente.`) && del.mutate(u.id)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function NotifPanel() {
  const send = useServerFn(adminSendNotification);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("info");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await send({ data: { title, body, type } });
      toast.success("Notificação enviada a todos os usuários");
      setTitle(""); setBody("");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Enviar notificação em massa</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Informação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" /> Enviar a todos</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function CouponsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListCoupons);
  const createFn = useServerFn(adminCreateCoupon);
  const toggleFn = useServerFn(adminToggleCoupon);
  const { data, isLoading } = useQuery({ queryKey: ["admin-coupons"], queryFn: () => listFn() });

  const [code, setCode] = useState("");
  const [months, setMonths] = useState(1);
  const [maxUses, setMaxUses] = useState(10);
  const [lifetime, setLifetime] = useState(false);
  const [expires, setExpires] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          code,
          duration_months: months,
          max_uses: maxUses,
          grants_lifetime: lifetime,
          expires_at: expires || null,
        },
      }),
    onSuccess: () => {
      toast.success("Cupom criado");
      setCode(""); setMonths(1); setMaxUses(10); setLifetime(false); setExpires("");
      qc.invalidateQueries({ queryKey: ["admin-coupons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Criar cupom</CardTitle></CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
            <div>
              <Label>Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required />
            </div>
            <div>
              <Label>Máximo de usos</Label>
              <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} />
            </div>
            <div>
              <Label>Duração (meses)</Label>
              <Input type="number" min={1} value={months} disabled={lifetime} onChange={(e) => setMonths(Number(e.target.value))} />
            </div>
            <div>
              <Label>Expira em (opcional)</Label>
              <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch checked={lifetime} onCheckedChange={setLifetime} id="lif" />
              <Label htmlFor="lif">Concede acesso vitalício</Label>
            </div>
            <Button type="submit" className="sm:col-span-2" disabled={create.isPending}>
              <Ticket className="mr-2 h-4 w-4" /> Criar cupom
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="space-y-2">
          {data?.coupons.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold">{c.code}</p>
                    {c.grants_lifetime && <Badge>Vitalício</Badge>}
                    {!c.active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {c.used_count}/{c.max_uses} usos ·{" "}
                    {c.grants_lifetime ? "acesso permanente" : `${c.duration_months} mês(es)`}
                    {c.expires_at && ` · expira ${new Date(c.expires_at).toLocaleDateString("pt-BR")}`}
                  </p>
                </div>
                <Switch checked={c.active} onCheckedChange={(v) => toggle.mutate({ id: c.id, active: v })} />
              </CardContent>
            </Card>
          ))}
          {data?.coupons.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cupom criado ainda.</p>}
        </div>
      )}
    </div>
  );
}

function severityColor(sev: string): string {
  if (sev === "critical") return "bg-red-600 text-white";
  if (sev === "error") return "bg-red-500/15 text-red-700 dark:text-red-300";
  if (sev === "warning") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function categoryLabel(cat: string): string {
  if (cat === "frontend") return "Frontend";
  if (cat === "server_function") return "Backend";
  if (cat === "security") return "Segurança";
  if (cat === "performance") return "Performance";
  return cat;
}

function MonitoringPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListErrorLogs);
  const statsFn = useServerFn(adminGetErrorStats);
  const resolveFn = useServerFn(adminResolveErrorLog);
  const clearFn = useServerFn(adminClearResolvedLogs);
  const [category, setCategory] = useState<"all" | "frontend" | "server_function" | "security" | "performance">("all");
  const [severity, setSeverity] = useState<"all" | "info" | "warning" | "error" | "critical">("all");
  const [onlyUnresolved, setOnlyUnresolved] = useState(true);

  const stats = useQuery({ queryKey: ["error-stats"], queryFn: () => statsFn(), refetchInterval: 30_000 });
  const list = useQuery({
    queryKey: ["error-logs", category, severity, onlyUnresolved],
    queryFn: () => listFn({ data: { category, severity, onlyUnresolved, limit: 100 } }),
    refetchInterval: 30_000,
  });

  const resolve = useMutation({
    mutationFn: (v: { id: string; resolved: boolean }) => resolveFn({ data: v }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["error-logs"] });
      qc.invalidateQueries({ queryKey: ["error-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearAll = useMutation({
    mutationFn: () => clearFn(),
    onSuccess: () => {
      toast.success("Registros resolvidos removidos");
      qc.invalidateQueries({ queryKey: ["error-logs"] });
      qc.invalidateQueries({ queryKey: ["error-stats"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Últimas 24h" value={stats.data?.total ?? 0} />
        <StatCard label="Não resolvidos" value={stats.data?.unresolved ?? 0} />
        <StatCard label="Críticos abertos" value={stats.data?.critical ?? 0} />
        <StatCard label="Segurança 24h" value={stats.data?.byCategory?.security ?? 0} />
      </div>

      {(stats.data?.critical ?? 0) > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {stats.data?.critical} evento(s) crítico(s) aguardando revisão.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            <SelectItem value="frontend">Frontend</SelectItem>
            <SelectItem value="server_function">Backend</SelectItem>
            <SelectItem value="security">Segurança</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas severidades</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="error">Erro</SelectItem>
            <SelectItem value="warning">Alerta</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 rounded-md border px-3 py-2">
          <Switch checked={onlyUnresolved} onCheckedChange={setOnlyUnresolved} id="unresolved-only" />
          <Label htmlFor="unresolved-only" className="text-sm">Só não resolvidos</Label>
        </div>
        <Button variant="outline" size="sm" onClick={() => { list.refetch(); stats.refetch(); }}>
          <RefreshCcw className="mr-2 h-4 w-4" />Atualizar
        </Button>
        <Button variant="ghost" size="sm" onClick={() => clearAll.mutate()} disabled={clearAll.isPending}>
          Limpar resolvidos
        </Button>
      </div>

      {list.isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="space-y-2">
          {(list.data ?? []).map((row) => (
            <Card key={row.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium ${severityColor(row.severity)}`}>
                    {row.severity.toUpperCase()}
                  </span>
                  <Badge variant="outline">{categoryLabel(row.category)}</Badge>
                  {row.resolved && <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">Resolvido</Badge>}
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(row.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm font-medium break-words">{row.message}</p>
                {row.route && <p className="text-xs text-muted-foreground">Rota: {row.route}</p>}
                {row.stack && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Stack trace</summary>
                    <pre className="mt-2 max-h-64 overflow-auto rounded bg-muted p-2 text-[11px]">{row.stack}</pre>
                  </details>
                )}
                {row.metadata && Object.keys(row.metadata as object).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground">Metadata</summary>
                    <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-[11px]">{JSON.stringify(row.metadata, null, 2)}</pre>
                  </details>
                )}
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant={row.resolved ? "outline" : "default"}
                    onClick={() => resolve.mutate({ id: row.id, resolved: !row.resolved })}
                    disabled={resolve.isPending}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    {row.resolved ? "Reabrir" : "Marcar resolvido"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(list.data ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum registro no filtro atual. 🎉</p>
          )}
        </div>
      )}
    </div>
  );
}
