import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, BULLETIN_TYPES } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { generateBulletin, reverseGeocode } from "@/lib/bulletins.functions";
import { CATEGORIES_BY_TYPE } from "@/lib/bulletin-categories";
import { toast } from "sonner";
import { SimilarCases } from "@/components/SimilarCases";
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
  MapPin,
  ExternalLink,
  FileDown,
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
  crew_composition: string | null;
  vehicle_prefix: string | null;
  occurrence_at: string | null;
  crew_address: string | null;
  crew_lat: number | null;
  crew_lng: number | null;
  occurrence_address: string | null;
  occurrence_lat: number | null;
  occurrence_lng: number | null;
};

// Formata timestamp ISO -> valor de <input type="datetime-local">
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(v: string): string | null {
  if (!v) return null;
  return new Date(v).toISOString();
}

// Remove textos entre chaves como {DADO AUSENTE}
function stripBraces(text: string): string {
  return text.replace(/\{[^{}]*\}/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function EditBulletin() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const genFn = useServerFn(generateBulletin);
  const geoFn = useServerFn(reverseGeocode);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [locating, setLocating] = useState<"crew" | "occ" | null>(null);
  const [b, setB] = useState<Bulletin | null>(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const dirtyRef = useRef(false);

  const typeInfo = useMemo(() => BULLETIN_TYPES.find((t) => t.code === b?.bulletin_type), [b]);
  const categories = useMemo(
    () => (b ? CATEGORIES_BY_TYPE[b.bulletin_type] ?? [] : []),
    [b],
  );
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
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setB(JSON.parse(cached));
          toast.info("Carregado do cache local (offline).");
        } else {
          toast.error("Boletim não encontrado");
          navigate({ to: "/dashboard" });
        }
      } else {
        const loaded = data as Bulletin;
        // Auto-preenche data/hora se ainda estiver vazia
        if (!loaded.occurrence_at) loaded.occurrence_at = new Date().toISOString();
        setB(loaded);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!b) return;
    localStorage.setItem(cacheKey, JSON.stringify(b));
  }, [b, cacheKey]);

  useEffect(() => {
    if (!online || !b || !dirtyRef.current) return;
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
      // Remove marcadores {…} automaticamente ao salvar
      const cleanedContent = stripBraces(b.content);
      const patch: Partial<Bulletin> = {
        title: b.title,
        category: b.category,
        keywords: b.keywords,
        context: b.context,
        content: cleanedContent,
        is_favorite: b.is_favorite,
        crew_composition: b.crew_composition,
        vehicle_prefix: b.vehicle_prefix,
        occurrence_at: b.occurrence_at,
        crew_address: b.crew_address,
        crew_lat: b.crew_lat,
        crew_lng: b.crew_lng,
        occurrence_address: b.occurrence_address,
        occurrence_lat: b.occurrence_lat,
        occurrence_lng: b.occurrence_lng,
      };
      if (nextStatus) patch.status = nextStatus;
      const { error } = await supabase.from("bulletins").update(patch).eq("id", b.id);
      if (error) throw error;
      dirtyRef.current = false;
      setB({ ...b, content: cleanedContent, ...(nextStatus ? { status: nextStatus } : {}) });
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
          crewComposition: b.crew_composition ?? undefined,
          vehiclePrefix: b.vehicle_prefix ?? undefined,
          occurrenceAt: b.occurrence_at ?? undefined,
          crewAddress: b.crew_address ?? undefined,
          occurrenceAddress: b.occurrence_address ?? undefined,
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
    await navigator.clipboard.writeText(stripBraces(b.content));
    toast.success("Copiado");
  }

  async function useCurrentLocation(kind: "crew" | "occ") {
    if (!navigator.geolocation) {
      toast.error("Geolocalização indisponível neste dispositivo.");
      return;
    }
    setLocating(kind);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { address } = await geoFn({ data: { lat: latitude, lng: longitude } });
          if (kind === "crew") {
            update("crew_lat", latitude);
            update("crew_lng", longitude);
            update("crew_address", address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } else {
            update("occurrence_lat", latitude);
            update("occurrence_lng", longitude);
            update("occurrence_address", address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
          toast.success("Localização preenchida");
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro ao consultar endereço");
        } finally {
          setLocating(null);
        }
      },
      (err) => {
        setLocating(null);
        toast.error(`Não foi possível obter localização: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function openMap(lat: number | null, lng: number | null, address: string | null) {
    let url: string;
    if (lat != null && lng != null) url = `https://www.google.com/maps?q=${lat},${lng}`;
    else if (address) url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    else {
      toast.error("Preencha o endereço primeiro.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function exportPDF() {
    if (!b) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = pageW - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(b.title || `${b.bulletin_type}`, margin, margin);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const metaLines: string[] = [];
    metaLines.push(`Tipo: ${b.bulletin_type}${b.category ? ` — ${b.category}` : ""}`);
    if (b.occurrence_at)
      metaLines.push(
        `Data/hora: ${new Date(b.occurrence_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`,
      );
    if (b.crew_composition) metaLines.push(`Guarnição: ${b.crew_composition}`);
    if (b.vehicle_prefix) metaLines.push(`Viatura: ${b.vehicle_prefix}`);
    if (b.crew_address) metaLines.push(`Endereço da guarnição: ${b.crew_address}`);
    if (b.occurrence_address) metaLines.push(`Local da ocorrência: ${b.occurrence_address}`);

    let y = margin + 20;
    for (const line of metaLines) {
      const wrapped = doc.splitTextToSize(line, maxW) as string[];
      doc.text(wrapped, margin, y);
      y += wrapped.length * 12;
    }

    y += 8;
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 16;

    doc.setFontSize(11);
    const bodyText = stripBraces(b.content) || "(sem conteúdo)";
    const wrapped = doc.splitTextToSize(bodyText, maxW) as string[];
    for (const line of wrapped) {
      if (y > pageH - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 14;
    }

    const safeTitle = (b.title || b.bulletin_type).replace(/[^\w\-]+/g, "_").slice(0, 60);
    doc.save(`${safeTitle}.pdf`);
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
              <label className="text-sm font-medium">Título do Boletim *</label>
              <input
                value={b.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Ex.: Abordagem com apreensão de entorpecente"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Categoria *</label>
              <select
                value={b.category ?? ""}
                onChange={(e) => update("category", e.target.value || null)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {categories.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                    {b.bulletin_type === "BO-COP" && c.requiresTC ? " (requer TC)" : ""}
                  </option>
                ))}
              </select>
              {b.bulletin_type === "BO-COP" &&
                b.category &&
                categories.find((c) => c.name === b.category)?.requiresTC && (
                  <p className="mt-1 text-xs text-warning">
                    Esta categoria exige também Termo Circunstanciado (BO-TC).
                  </p>
                )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <h3 className="text-sm font-semibold">Dados operacionais</h3>
            <div>
              <label className="text-sm font-medium">Composição da Guarnição *</label>
              <input
                value={b.crew_composition ?? ""}
                onChange={(e) => update("crew_composition", e.target.value)}
                placeholder="Ex.: SD PM Kemerson; CB PM Silva"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Prefixo da viatura</label>
                <input
                  value={b.vehicle_prefix ?? ""}
                  onChange={(e) => update("vehicle_prefix", e.target.value)}
                  placeholder="Ex.: 12-345"
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Data e Hora *</label>
                <input
                  type="datetime-local"
                  value={toLocalInput(b.occurrence_at)}
                  onChange={(e) => update("occurrence_at", fromLocalInput(e.target.value))}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">LOCALIZAÇÃO DA GUARNIÇÃO *</label>
              <textarea
                value={b.crew_address ?? ""}
                onChange={(e) => update("crew_address", e.target.value)}
                rows={2}
                placeholder="Rua, número, bairro..."
                className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-1.5 flex gap-2">
                <button
                  onClick={() => useCurrentLocation("crew")}
                  disabled={locating === "crew"}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60"
                >
                  {locating === "crew" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  Usar minha localização
                </button>
                <button
                  onClick={() => openMap(b.crew_lat, b.crew_lng, b.crew_address)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir no mapa
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Localização da Ocorrência *</label>
              <textarea
                value={b.occurrence_address ?? ""}
                onChange={(e) => update("occurrence_address", e.target.value)}
                rows={2}
                placeholder="Endereço do despacho / local dos fatos"
                className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="mt-1.5 flex gap-2">
                <button
                  onClick={() => useCurrentLocation("occ")}
                  disabled={locating === "occ"}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-60"
                >
                  {locating === "occ" ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MapPin className="h-3 w-3" />
                  )}
                  Usar minha localização
                </button>
                <button
                  onClick={() => openMap(b.occurrence_lat, b.occurrence_lng, b.occurrence_address)}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                >
                  <ExternalLink className="h-3 w-3" /> Abrir no mapa
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border bg-card p-4">
            <div>
              <label className="text-sm font-medium">Palavras-chave *</label>
              <textarea
                value={b.keywords ?? ""}
                onChange={(e) => update("keywords", e.target.value)}
                rows={4}
                placeholder="Fatos, ações, indivíduos, objetos apreendidos, etc."
                className="mt-1 w-full resize-y rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Liste fatos e ações. Nada será inventado.
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

          <SimilarCases
            bulletinType={b.bulletin_type}
            keywords={b.keywords}
            category={b.category}
            context={b.context}
            onUseReference={(text) => {
              const prefix = b.context ? `${b.context}\n\n` : "";
              update("context", `${prefix}[Referência de caso semelhante]\n${text.slice(0, 800)}`);
              toast.success("Referência adicionada ao contexto");
            }}
          />
        </aside>

        <section className="rounded-2xl border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
            <div className="text-sm font-medium">Documento</div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={copyText}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
              <button
                onClick={exportPDF}
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
              >
                <FileDown className="h-3.5 w-3.5" /> Exportar PDF
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
            placeholder="O texto gerado aparecerá aqui. Marcadores entre chaves {…} serão removidos ao salvar."
            className="w-full resize-y rounded-b-2xl bg-transparent p-4 font-mono text-sm leading-relaxed outline-none"
          />
        </section>
      </div>
    </AppShell>
  );
}
