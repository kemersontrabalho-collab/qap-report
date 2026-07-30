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
  
} from "lucide-react";


export const Route = createFileRoute("/_authenticated/bulletins/$id")({
  head: () => ({ meta: [{ title: "Editar boletim · QAP Report" }, { name: "robots", content: "noindex" }] }),
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

// Remove textos entre chaves como {DADO AUSENTE} e limpa marcações
// markdown (# de títulos e * de negrito/itálico/listas) que não pertencem
// ao histórico final do boletim.
function stripBraces(text: string): string {
  return text
    .replace(/\{[^{}]*\}/g, "")
    // Remove marcadores de título markdown no início de linha (# até ######)
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    // Remove ênfase markdown: **negrito**, __negrito__, *itálico*, _itálico_
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, "$2")
    // Remove asteriscos remanescentes (bullets soltos, ênfases mal formadas)
    .replace(/\*+/g, "")
    // Limpa espaços/linhas em excesso
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Extrai a seção "PERGUNTAS COMPLEMENTARES" e os marcadores {DADO AUSENTE}
// do conteúdo gerado, transformando-os em uma lista de sugestões de melhoria.
function extractImprovementSuggestions(content: string | null | undefined): string[] {
  if (!content) return [];
  const suggestions: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim().replace(/^[-•*\d.\)\s]+/, "").trim();
    if (t.length < 2) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    suggestions.push(t);
  };

  // 1) Seção "PERGUNTAS COMPLEMENTARES:" até o fim ou próxima seção em caixa alta
  const m = content.match(/PERGUNTAS\s+COMPLEMENTARES\s*:?\s*([\s\S]*?)(?:\n\s*[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s/]{3,}:|\s*$)/i);
  if (m && m[1]) {
    m[1]
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach(push);
  }

  // 2) Marcadores {DADO AUSENTE} espalhados no texto
  const braces = content.match(/\{[^{}]+\}/g) ?? [];
  braces.forEach((b) => {
    const label = b.replace(/[{}]/g, "").trim();
    if (label) push(`Informar: ${label}`);
  });

  return suggestions;
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
        // Erro de rede — tenta o cache local silenciosamente.
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          try {
            setB(JSON.parse(cached));
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
        toast.error("Sem conexão. Verifique sua internet e tente novamente.");
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

      <h1 className="sr-only">{b.title || `Editar ${b.bulletin_type}`}</h1>


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
              <CategorySearch
                categories={categories}
                value={b.category}
                bulletinType={b.bulletin_type}
                onChange={(v) => update("category", v)}
              />
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
              <label className="text-sm font-medium">Sugestões de melhoria</label>
              {(() => {
                const suggestions = extractImprovementSuggestions(b.content);
                if (!b.content) {
                  return (
                    <p className="mt-1 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Gere o texto para ver aqui as perguntas complementares e dados faltantes identificados pela IA.
                    </p>
                  );
                }
                if (suggestions.length === 0) {
                  return (
                    <p className="mt-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Nenhuma sugestão pendente — o histórico está completo.
                    </p>
                  );
                }
                return (
                  <ul className="mt-1 space-y-1 rounded-lg border bg-muted/30 px-3 py-2 text-xs">
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-primary">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
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

function CategorySearch({
  categories,
  value,
  bulletinType,
  onChange,
}: {
  categories: { name: string; requiresTC?: boolean }[];
  value: string | null;
  bulletinType: string;
  onChange: (v: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const normalize = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = normalize(query.trim());
  const filtered = q
    ? categories.filter((c) => normalize(c.name).includes(q))
    : categories;

  const select = (name: string) => {
    onChange(name);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative mt-1">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2">
        <input
          value={open ? query : value ?? ""}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          placeholder="Pesquisar categoria..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setQuery("");
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
            aria-label="Limpar categoria"
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border bg-popover shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Nenhuma categoria encontrada.
            </div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => select(c.name)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent ${
                  value === c.name ? "bg-accent/50 font-medium" : ""
                }`}
              >
                <span>{c.name}</span>
                {bulletinType === "BO-COP" && c.requiresTC && (
                  <span className="ml-2 text-xs text-warning">requer TC</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

