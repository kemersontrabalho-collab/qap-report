import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, BULLETIN_TYPES } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { generateBulletin } from "@/lib/bulletins.functions";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  Save,
  CheckCircle2,
  Loader2,
  Copy,
  Star,
  Trash2,
  WifiOff,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/bulletins/$id")({
  head: () => ({ meta: [{ title: "Editar boletim · RedaPol" }] }),
  component: EditBulletin,
});

type Bulletin = {
  id: string;
  bulletin_type: string;
  category: string | null;
  title: string;
  keywords: string | null;
  context: string | null;
  content: string;
  status: "draft" | "done";
  is_favorite: boolean;
  deleted_at: string | null;
};

function EditBulletin() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const genFn = useServerFn(generateBulletin);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [b, setB] = useState<Bulletin | null>(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const dirtyRef = useRef(false);

  const typeInfo = useMemo(() => BULLETIN_TYPES.find((t) => t.code === b?.bulletin_type), [b]);
  const cacheKey = `bulletin-cache:${id}`;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("bulletins").select("*").eq("id", id).single();
      if (error || !data) {
        // Try local cache
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setB(JSON.parse(cached));
          toast.info("Carregado do cache local (offline).");
        } else {
          toast.error("Boletim não encontrado");
          navigate({ to: "/dashboard" });
        }
      } else {
        setB(data as Bulletin);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Local cache + offline sync
  useEffect(() => {
    if (!b) return;
    localStorage.setItem(cacheKey, JSON.stringify(b));
  }, [b, cacheKey]);

  useEffect(() => {
    if (!online || !b || !dirtyRef.current) return;
    // when back online, push pending changes
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  function update<K extends keyof Bulletin>(key: K, value: Bulletin[K]) {
    if (!b) return;
    dirtyRef.current = true;
    setB({ ...b, [key]: value });
  }

  async function save(nextStatus?: "draft" | "done") {
    if (!b) return;
    setSaving(true);
    try {
      if (!online) {
        toast.info("Salvo localmente. Sincroniza quando voltar online.");
        return;
      }
      const patch: Partial<Bulletin> = {
        title: b.title,
        category: b.category,
        keywords: b.keywords,
        context: b.context,
        content: b.content,
        is_favorite: b.is_favorite,
      };
      if (nextStatus) patch.status = nextStatus;
      const { error } = await supabase.from("bulletins").update(patch).eq("id", b.id);
      if (error) throw error;
      dirtyRef.current = false;
      if (nextStatus) setB({ ...b, status: nextStatus });
      toast.success(nextStatus === "done" ? "Boletim concluído" : "Salvo");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    if (!b) return;
    if (!b.keywords || b.keywords.trim().length < 3) {
      toast.error("Informe as palavras-chave antes de gerar.");
      return;
    }
    if (!online) {
      toast.error("A geração por IA requer conexão com a internet.");
      return;
    }
    setGenerating(true);
    try {
      const res = await genFn({
        data: {
          bulletinType: b.bulletin_type as "BA" | "BO-COP" | "BO-TC" | "BOAT",
          category: b.category ?? undefined,
          keywords: b.keywords,
          context: b.context ?? undefined,
        },
      });
      update("content", res.content);
      toast.success("Texto gerado. Revise antes de concluir.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar");
    } finally {
      setGenerating(false);
    }
  }

  async function copyText() {
    if (!b?.content) return;
    await navigator.clipboard.writeText(b.content);
    toast.success("Copiado");
  }

  async function trash() {
    if (!b) return;
    if (!confirm("Mover para a lixeira?")) return;
    await supabase.from("bulletins").update({ deleted_at: new Date().toISOString() }).eq("id", b.id);
    localStorage.removeItem(cacheKey);
    navigate({ to: "/dashboard" });
  }

  if (loading || !b) {
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
      <div className="mb-4 flex items-center justify-between gap-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-2 py-1 text-xs text-warning-foreground">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}
          <button
            onClick={() => update("is_favorite", !b.is_favorite)}
            className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-accent"
            aria-label="Favoritar"
          >
            <Star className={`h-4 w-4 ${b.is_favorite ? "fill-warning text-warning" : ""}`} />
          </button>
          <button
            onClick={trash}
            className="grid h-9 w-9 place-items-center rounded-lg border text-destructive hover:bg-destructive/10"
            aria-label="Lixeira"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-4">
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {b.bulletin_type}
            </span>
            <h2 className="mt-2 font-semibold">{typeInfo?.name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{typeInfo?.desc}</p>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div>
              <label className="text-sm font-medium">Título</label>
              <input
                value={b.title}
                onChange={(e) => update("title", e.target.value)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria</label>
              <select
                value={b.category ?? ""}
                onChange={(e) => update("category", e.target.value || null)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {typeInfo?.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Palavras-chave *</label>
              <textarea
                value={b.keywords ?? ""}
                onChange={(e) => update("keywords", e.target.value)}
                rows={4}
                placeholder="Ex.: composição PM Silva e PM Souza; VTR 12-345; via pública Av. Central; abordagem; entorpecente..."
                className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Liste fatos, nomes, horários, locais e ações. Nada será inventado.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Contexto adicional</label>
              <textarea
                value={b.context ?? ""}
                onChange={(e) => update("context", e.target.value)}
                rows={3}
                className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <button
              onClick={generate}
              disabled={generating}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Gerando..." : b.content ? "Regerar texto" : "Gerar texto"}
            </button>
          </div>
        </aside>

        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between gap-2 border-b p-3">
            <div className="text-sm font-medium">Documento</div>
            <div className="flex items-center gap-2">
              <button
                onClick={copyText}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
              <button
                onClick={() => save()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Salvar
              </button>
              <button
                onClick={() => save("done")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-xs font-medium text-success-foreground hover:opacity-90"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
              </button>
            </div>
          </div>
          <textarea
            value={b.content}
            onChange={(e) => update("content", e.target.value)}
            rows={28}
            placeholder="O texto gerado aparecerá aqui. Você pode editar livremente."
            className="w-full resize-y rounded-b-2xl bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
        </section>
      </div>
    </AppShell>
  );
}
