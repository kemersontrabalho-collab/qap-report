import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, BULLETIN_TYPES } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { generateBulletin, reverseGeocode } from "@/lib/bulletins.functions";
import { CATEGORIES_BY_TYPE } from "@/lib/bulletin-categories";
import { toast } from "sonner";
import { SimilarCases } from "@/components/SimilarCases";
import { VoiceDictateButton } from "@/components/VoiceDictateButton";
import { translateDbError, translateGeolocationError } from "@/lib/i18n-errors";
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
  head: () => ({ meta: [{ title: "Editar boletim · QAP Report" }] }),
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
  const bRef = useRef<Bulletin | null>(null);
  bRef.current = b;

  const typeInfo = useMemo(() => BULLETIN_TYPES.find((t) => t.code === b?.bulletin_type), [b]);
  const categories = useMemo(
    () => (b ? CATEGORIES_BY_TYPE[b.bulletin_type] ?? [] : []),
    [b],
  );
  const cacheKey = `bulletin-cache:${id}`;
  const dirtyKey = `bulletin-dirty:${id}`;

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
      const { data, error } = await supabase.from("bulletins").select("*").eq("id", id).maybeSingle();
      if (data) {
        const loaded = data as Bulletin;
        if (!loaded.occurrence_at) loaded.occurrence_at = new Date().toISOString();
        setB(loaded);
        // Se tinha alterações pendentes salvas localmente, mantém como dirty
        // para o effect de "online" ressincronizar.
        if (localStorage.getItem(dirtyKey) === "1") dirtyRef.current = true;
      } else if (!error || error.code === "PGRST116") {
        // 404 real (registro não existe / RLS). Não tentar cache — evita
        // reviver boletins apagados por outro dispositivo.
        toast.error("Boletim não encontrado");
        navigate({ to: "/dashboard" });
      } else {
        // Erro de rede — tenta o cache local.
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setB(JSON.parse(cached));
            toast.info("Carregado do cache local (offline).");
            if (localStorage.getItem(dirtyKey) === "1") dirtyRef.current = true;
          } catch {
            toast.error(translateDbError(error));
            navigate({ to: "/dashboard" });
          }
        } else {
          toast.error(translateDbError(error));
          navigate({ to: "/dashboard" });
        }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!b) return;
    localStorage.setItem(cacheKey, JSON.stringify(b));
    if (dirtyRef.current) localStorage.setItem(dirtyKey, "1");
  }, [b, cacheKey, dirtyKey]);

  useEffect(() => {
    if (!online) return;
    if (!bRef.current) return;
    if (!dirtyRef.current) return;
    save();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  function update<K extends keyof Bulletin>(key: K, value: Bulletin[K]) {
    if (!b) return;
    dirtyRef.current = true;
    localStorage.setItem(dirtyKey, "1");
    setB({ ...b, [key]: value });
  }


  async function save(nextStatus?: "draft" | "done") {
    const current = bRef.current;
    if (!current) return;
    setSaving(true);
    try {
      if (!online) {
        toast.info("Salvo localmente. Sincroniza quando voltar online.");
        return;
      }
      // Só limpa marcadores {…} ao CONCLUIR — evita "cursor pulando" durante
      // o autosave enquanto o usuário ainda está digitando.
      const finalContent = nextStatus === "done" ? stripBraces(current.content) : current.content;
      const patch: Partial<Bulletin> = {
        title: current.title,
        category: current.category,
        keywords: current.keywords,
        context: current.context,
        content: finalContent,
        is_favorite: current.is_favorite,
        crew_composition: current.crew_composition,
        vehicle_prefix: current.vehicle_prefix,
        occurrence_at: current.occurrence_at,
        crew_address: current.crew_address,
        crew_lat: current.crew_lat,
        crew_lng: current.crew_lng,
        occurrence_address: current.occurrence_address,
        occurrence_lat: current.occurrence_lat,
        occurrence_lng: current.occurrence_lng,
      };
      if (nextStatus) patch.status = nextStatus;
      const { error } = await supabase.from("bulletins").update(patch).eq("id", current.id);
      if (error) throw error;
      dirtyRef.current = false;
      localStorage.removeItem(dirtyKey);
      setB({ ...current, content: finalContent, ...(nextStatus ? { status: nextStatus } : {}) });
      toast.success(nextStatus === "done" ? "Boletim concluído" : "Salvo");
    } catch (e) {
      toast.error(translateDbError(e));
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
        toast.error(translateGeolocationError(err));
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
    // Usa a impressão nativa do navegador (Salvar como PDF) para preservar
    // acentos e caracteres especiais em português. jsPDF puro usa Latin-1
    // no core-font padrão e corrompe caracteres como "ç", "ã", "õ".
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      toast.error("Permita popups para exportar o PDF.");
      return;
    }
    const title = b.title || b.bulletin_type;
    const meta: [string, string | null | undefined][] = [
      ["Título do Boletim", b.title],
      ["Categoria", b.category],
      ["Tipo", b.bulletin_type],
      ["Composição da Guarnição", b.crew_composition],
      ["Prefixo da viatura", b.vehicle_prefix],
      [
        "Data e Hora",
        b.occurrence_at
          ? new Date(b.occurrence_at).toLocaleString("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            })
          : null,
      ],
      ["LOCALIZAÇÃO DA GUARNIÇÃO", b.crew_address],
      ["Localização da Ocorrência", b.occurrence_address],
    ];
    const metaHtml = meta
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `<div><span class="k">${escapeHtml(k)}:</span> <span>${escapeHtml(String(v))}</span></div>`,
      )
      .join("");
    const body = escapeHtml(stripBraces(b.content) || "(sem conteúdo)");
    w.document.write(`<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Georgia,'Times New Roman',serif;color:#111;padding:40px;max-width:800px;margin:0 auto;line-height:1.5}
  h1{font-size:20px;margin:0 0 12px}
  .meta{font-size:12px;margin:8px 0 16px}
  .meta div{margin:2px 0}
  .k{font-weight:600}
  hr{border:0;border-top:1px solid #ccc;margin:16px 0}
  pre{white-space:pre-wrap;font-family:inherit;font-size:13px;margin:0}
  @media print{@page{margin:20mm} body{padding:0}}
</style></head><body>
  <h1>${escapeHtml(title)}</h1>
  <div class="meta">${metaHtml}</div>
  <hr>
  <pre>${body}</pre>
  <script>window.onload=function(){setTimeout(function(){window.focus();window.print();},150);};<\/script>
</body></html>`);
    w.document.close();
  }

  async function trash() {
    if (!b) return;
    if (!confirm("Mover para a lixeira?")) return;
    const { error } = await supabase
      .from("bulletins")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", b.id);
    if (error) {
      toast.error(translateDbError(error));
      return;
    }
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(dirtyKey);
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
                placeholder="Ex.: SD PM FULANO; SD PM BELTRANO"
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Palavras-chave *</label>
                <VoiceDictateButton
                  value={b.keywords ?? ""}
                  onChange={(v) => update("keywords", v)}
                />
              </div>
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
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Contexto adicional</label>
                <VoiceDictateButton
                  value={b.context ?? ""}
                  onChange={(v) => update("context", v)}
                />
              </div>
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
