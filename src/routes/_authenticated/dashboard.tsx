import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell, BULLETIN_TYPES } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
} from "lucide-react";

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

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Painel · QAP Report" }] }),
  component: Dashboard,
});

function useBulletins() {
  return useQuery({
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
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: bulletins = [], isLoading } = useBulletins();
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
      if (tab === "drafts" && b.status !== "draft") return false;
      if (tab === "done" && b.status !== "done") return false;
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
  });

  const restore = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bulletins").update({ deleted_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bulletins"] }),
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
  });

  const emptyTrash = async () => {
    if (!confirm("Esvaziar a lixeira? Esta ação é definitiva.")) return;
    const trashed = bulletins.filter((b) => b.deleted_at);
    if (!trashed.length) return;
    // Batch — uma única requisição em vez de N requests sequenciais.
    const { error } = await supabase
      .from("bulletins")
      .delete()
      .in("id", trashed.map((b) => b.id));
    if (error) {
      toast.error("Não foi possível esvaziar a lixeira. Tente novamente.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["bulletins"] });
    toast.success("Lixeira esvaziada");
  };


  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "drafts", label: "Rascunhos", icon: ClipboardEdit },
    { key: "done", label: "Já Feitos", icon: CheckCircle2 },
    { key: "favorites", label: "Favoritos", icon: Star },
    { key: "trash", label: "Lixeira", icon: Trash2 },
  ];

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Painel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione um tipo de boletim para criar, ou gerencie os existentes.
        </p>
      </div>

      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BULLETIN_TYPES.map((t) => (
          <button
            key={t.code}
            disabled={createMut.isPending && creatingType === t.code}
            onClick={() => {
              setCreatingType(t.code);
              createMut.mutate(t.code);
            }}
            className="group flex flex-col items-start rounded-2xl border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-md disabled:opacity-60"
          >
            <div className="flex w-full items-center justify-between">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                {t.code}
              </span>
              <Plus className="h-4 w-4 text-muted-foreground transition-transform group-hover:rotate-90" />
            </div>
            <h3 className="mt-3 text-sm font-semibold leading-tight">{t.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{t.desc}</p>
          </button>
        ))}
      </section>

      <section className="rounded-2xl border bg-card">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const active = tab === t.key;
              const count = bulletins.filter((b) => {
                if (t.key === "trash") return !!b.deleted_at;
                if (b.deleted_at) return false;
                if (t.key === "drafts") return b.status === "draft";
                if (t.key === "done") return b.status === "done";
                if (t.key === "favorites") return b.is_favorite;
                return true;
              }).length;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                  <span
                    className={`ml-1 rounded-full px-1.5 text-xs ${
                      active ? "bg-primary-foreground/20" : "bg-muted"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por título, texto ou data..."
                className="w-full rounded-lg border bg-background py-1.5 pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            {tab === "trash" && bulletins.some((b) => b.deleted_at) && (
              <button
                onClick={emptyTrash}
                className="rounded-lg border border-destructive/50 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10"
              >
                Esvaziar
              </button>
            )}
          </div>
        </div>

        <ul className="divide-y">
          {isLoading && (
            <li className="p-8 text-center text-sm text-muted-foreground">Carregando...</li>
          )}
          {!isLoading && filtered.length === 0 && (
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
