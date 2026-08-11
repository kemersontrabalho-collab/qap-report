import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, BULLETIN_TYPES } from "@/components/AppShell";
import { TrialBanner } from "@/components/TrialBanner";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSuspenseQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText,
  Star,
  Trash2,
  Search,
  ClipboardEdit,
  CheckCircle2,
  Plus,
  StarOff,
  RotateCcw,
  Menu,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Bulletin = {
  id: string;
  bulletin_type: string;
  category: string | null;
  title: string;
  content: string;
  status: "draft" | "done";
  is_favorite: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

type Tab = "drafts" | "done" | "favorites" | "trash";

const bulletinsQueryOptions = queryOptions({
  queryKey: ["bulletins"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bulletins")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Bulletin[];
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel · QAP Report" },
      {
        name: "description",
        content:
          "Área privada do QAP Report para criar, editar e gerenciar boletins policiais do usuário.",
      },
      { property: "og:title", content: "Painel · QAP Report" },
      {
        property: "og:description",
        content: "Área privada para criar, editar e gerenciar boletins policiais no QAP Report.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(bulletinsQueryOptions),
  pendingComponent: DashboardSkeleton,
  errorComponent: ({ error, reset }) => (
    <AppShell>
      <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="text-lg font-semibold text-destructive">
          Não foi possível carregar seus boletins
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Erro desconhecido"}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent"
        >
          Tentar novamente
        </button>
      </div>
    </AppShell>
  ),
  component: Dashboard,
});

function DashboardSkeleton() {
  return (
    <AppShell>
      <div className="mb-6 space-y-2">
        <div className="h-8 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border bg-card" />
        ))}
      </div>
      <div className="h-96 animate-pulse rounded-2xl border bg-card" />
    </AppShell>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: bulletins } = useSuspenseQuery(bulletinsQueryOptions);

  const [tab, setTab] = useState<Tab>("drafts");
  const [search, setSearch] = useState("");
  const [creatingType, setCreatingType] = useState<string | null>(null);

  // Auto-purga da lixeira: uma vez por sessão (evita spam de DELETE a cada
  // montagem do dashboard). O servidor ainda respeita RLS e só apaga do próprio
  // usuário. Um cron poderia substituir isso no futuro.
  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem("trash-purged")) return;
    sessionStorage.setItem("trash-purged", "1");
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase
      .from("bulletins")
      .delete()
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoff)
      .then(({ error }) => {
        if (!error) qc.invalidateQueries({ queryKey: ["bulletins"] });
      });
  }, [qc]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    return bulletins.filter((b) => {
      if (tab === "trash" && !b.deleted_at) return false;
      if (tab !== "trash" && b.deleted_at) return false;
      // Favoritos ficam SOMENTE na aba "Favoritos".
      if (tab === "drafts" && (b.status !== "draft" || b.is_favorite)) return false;
      if (tab === "done" && (b.status !== "done" || b.is_favorite)) return false;
      if (tab === "favorites" && !b.is_favorite) return false;

      if (!s) return true;
      return (
        b.title.toLowerCase().includes(s) ||
        b.content.toLowerCase().includes(s) ||
        (b.category ?? "").toLowerCase().includes(s) ||
        new Date(b.created_at).toLocaleDateString("pt-BR").includes(s)
      );
    });
  }, [bulletins, tab, search]);

  const createMut = useMutation({
    mutationFn: async (type: string) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("bulletins")
        .insert({
          user_id: userData.user.id,
          bulletin_type: type,
          title: `Novo ${type}`,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["bulletins"] });
      navigate({ to: "/bulletins/$id", params: { id: data.id } });
    },
    onSettled: () => setCreatingType(null),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const softDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bulletins")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bulletins"] });
      toast.success("Movido para a lixeira");
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível mover para a lixeira"),
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bulletins").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bulletins"] });
      toast.success("Boletim restaurado");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível restaurar"),
  });

  const hardDelete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bulletins").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bulletins"] });
      toast.success("Excluído definitivamente");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível excluir"),
  });

  const toggleFav = useMutation({
    mutationFn: async (b: Bulletin) => {
      const { error } = await supabase
        .from("bulletins")
        .update({ is_favorite: !b.is_favorite })
        .eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulletins"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível favoritar"),
  });

  const emptyTrash = async () => {
    if (!confirm("Esvaziar a lixeira? Esta ação é definitiva.")) return;
    const trashed = bulletins.filter((b) => b.deleted_at);
    if (!trashed.length) return;
    // Batch — uma única requisição em vez de N requests sequenciais.
    const { error } = await supabase
      .from("bulletins")
      .delete()
      .in(
        "id",
        trashed.map((b) => b.id),
      );
    if (error) {
      toast.error("Não foi possível esvaziar a lixeira. Tente novamente.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["bulletins"] });
    toast.success("Lixeira esvaziada");
  };

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "drafts", label: "Rascunhos", icon: ClipboardEdit },
    { key: "done", label: "Concluídos", icon: CheckCircle2 },
    { key: "favorites", label: "Favoritos", icon: Star },
    { key: "trash", label: "Lixeira", icon: Trash2 },
  ];

  const counts = tabs.reduce<Record<Tab, number>>(
    (acc, t) => {
      acc[t.key] = bulletins.filter((b) => {
        if (t.key === "trash") return !!b.deleted_at;
        if (b.deleted_at) return false;
        if (t.key === "drafts") return b.status === "draft" && !b.is_favorite;
        if (t.key === "done") return b.status === "done" && !b.is_favorite;
        if (t.key === "favorites") return b.is_favorite;

        return true;
      }).length;
      return acc;
    },
    { drafts: 0, done: 0, favorites: 0, trash: 0 },
  );

  const activeTab = tabs.find((t) => t.key === tab)!;

  return (
    <AppShell>
      <TrialBanner />
      <div className="aurora relative mb-8">
        <div className="reveal">
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-line)] bg-card/60 px-3 py-1 text-fluid-xs font-medium text-muted-foreground backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-bright)]" />
            Assistente de redação policial
          </span>
          <h1 className="mt-3 text-fluid-2xl font-bold tracking-tight">
            Painel <span className="text-gradient-brand">operacional</span>
          </h1>
          <p className="measure mt-1.5 text-fluid-sm text-muted-foreground">
            Selecione um tipo de boletim para criar, ou gerencie os existentes.
          </p>
        </div>
      </div>

      {/*
       * GRID DE TIPOS — escada de densidade guiada pelo conteúdo, não pelo
       * aparelho: 1 coluna (a descrição precisa de ~30ch), 2 a partir de 480px,
       * 2 confortáveis no tablet retrato, 4 no desktop. `auto-rows-fr` mantém
       * todos os cartões da mesma altura mesmo com descrições de tamanhos
       * diferentes, evitando serrilhado visual.
       */}
      <section
        data-tour="bulletin-types"
        className="mb-8 grid auto-rows-fr grid-cols-1 gap-3 xs:grid-cols-2 lg:grid-cols-4"
      >
        {BULLETIN_TYPES.map((t, i) => (
          <button
            key={t.code}
            disabled={createMut.isPending}
            aria-busy={createMut.isPending && creatingType === t.code}
            onClick={() => {
              if (createMut.isPending) return;
              setCreatingType(t.code);
              createMut.mutate(t.code);
            }}
            style={{ ["--d" as string]: `${80 + i * 70}ms` }}
            className="surface-card lift reveal group relative flex flex-col items-start overflow-hidden rounded-2xl p-4 text-left disabled:opacity-60"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-16 h-24 bg-[radial-gradient(60%_100%_at_50%_100%,color-mix(in_oklab,var(--brand-bright)_28%,transparent),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div className="flex w-full items-center justify-between">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold tracking-wide text-primary ring-1 ring-inset ring-primary/15">
                {t.code}
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-full border border-[var(--surface-line)] bg-background/60 text-muted-foreground transition-all duration-500 [transition-timing-function:var(--ease-spring)] group-hover:border-transparent group-hover:bg-[var(--gradient-brand)] group-hover:text-primary-foreground">
                <Plus className="h-4 w-4 transition-transform duration-500 group-hover:rotate-90" />
              </span>
            </div>
            <h3 className="mt-3 text-sm font-semibold leading-tight">{t.name}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
          </button>
        ))}
      </section>


      <section className="surface-card reveal overflow-hidden rounded-2xl" style={{ ["--d" as string]: "360ms" }}>
        {/*
         * TOOLBAR — no mobile é um grid de 2 linhas:
         *   linha 1: [título elástico | ações fixas]
         *   linha 2: busca ocupando 100% (campo de texto precisa de largura)
         * A partir de sm vira uma linha só. O antigo `flex-col` empilhava a
         * busca junto das ações, deixando "Esvaziar" e o menu espremidos.
         */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b p-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-2">
            <activeTab.icon className="h-5 w-5 shrink-0 text-primary" />
            <h2 className="truncate text-base font-semibold">{activeTab.label}</h2>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {counts[activeTab.key]}
            </span>
          </div>
          <div
            data-tour="dashboard-search"
            className="relative order-last col-span-2 w-full sm:order-none sm:col-span-1 sm:w-64"
          >
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, texto ou data..."
              aria-label="Buscar boletins"
              className="min-h-11 w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring sm:min-h-9"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {tab === "trash" && bulletins.some((b) => b.deleted_at) && (
              <button
                onClick={emptyTrash}
                className="min-h-11 whitespace-nowrap rounded-lg border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 sm:min-h-9 sm:py-1.5"
              >
                Esvaziar
              </button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger
                data-tour="tabs-menu"
                aria-label="Abrir menu de abas"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg border bg-background text-foreground hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring sm:h-9 sm:w-9"
              >
                <Menu className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Abas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tabs.map((t) => {
                  const active = tab === t.key;
                  return (
                    <DropdownMenuItem
                      key={t.key}
                      onSelect={() => setTab(t.key)}
                      className={active ? "bg-accent" : ""}
                    >
                      <t.icon className="mr-2 h-4 w-4" />
                      <span className="flex-1">{t.label}</span>
                      <span className="ml-2 rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
                        {counts[t.key]}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <ul className="divide-y">
          {filtered.length === 0 && (
            <li className="p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Nenhum boletim aqui ainda.</p>
            </li>
          )}
          {filtered.map((b) => (
            <li key={b.id} className="group flex items-center gap-3 p-4 hover:bg-accent/50">
              <Link
                to="/bulletins/$id"
                params={{ id: b.id }}
                className="flex flex-1 items-center gap-3 min-w-0"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {b.bulletin_type}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{b.title}</p>
                    {b.status === "done" && (
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                        Concluído
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {b.category ?? "Sem categoria"} ·{" "}
                    {new Date(b.updated_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {!b.deleted_at && (
                  <button
                    onClick={() => toggleFav.mutate(b)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent hover:text-warning"
                    aria-label="Favoritar"
                  >
                    {b.is_favorite ? (
                      <Star className="h-4 w-4 fill-warning text-warning" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>
                )}
                {b.deleted_at ? (
                  <>
                    <button
                      onClick={() => restore.mutate(b.id)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-accent"
                      aria-label="Restaurar"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("Excluir definitivamente?")) hardDelete.mutate(b.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                      aria-label="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => softDelete.mutate(b.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Mover para lixeira"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
