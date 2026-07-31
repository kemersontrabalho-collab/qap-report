import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { findSimilarBulletins, type SimilarCase } from "@/lib/knowledge.functions";
import { Lightbulb, Loader2, FileText } from "lucide-react";

type Props = {
  bulletinType: string;
  keywords: string | null;
  category: string | null;
  context: string | null;
  onUseReference: (text: string) => void;
};

export function SimilarCases({ bulletinType, keywords, category, context, onUseReference }: Props) {
  const findFn = useServerFn(findSimilarBulletins);
  const [items, setItems] = useState<SimilarCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const query = [category, keywords, context].filter(Boolean).join(" ").trim();

  useEffect(() => {
    if (query.length < 5) {
      setItems([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await findFn({ data: { query, bulletinType, limit: 3 } });
        if (cancelled) return; // Ignora resposta obsoleta (race).
        setItems(res);
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "Erro ao buscar casos");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, bulletinType, findFn]);

  if (query.length < 5) return null;


  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-warning" />
        <h3 className="text-sm font-semibold">Casos semelhantes na base</h3>
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Boletins concluídos anteriormente e casos anônimos aprovados da comunidade que se parecem com o
        que você está redigindo.
      </p>

      {err && <div className="mt-3 text-xs text-destructive">{err}</div>}

      {!loading && !err && items.length === 0 && (
        <div className="mt-3 text-xs text-muted-foreground">
          Nenhum caso semelhante encontrado ainda. À medida que boletins forem concluídos, sugestões aparecerão aqui.
        </div>
      )}

      <ul className="mt-3 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                    {it.bulletin_type}
                  </span>
                  {it.source === "community" && (
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                      Comunidade
                    </span>
                  )}
                  <p className="truncate text-sm font-medium">{it.title}</p>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {it.category ?? "Sem categoria"}
                  {it.occurrence_address ? ` · ${it.occurrence_address}` : ""}
                </p>
                <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                  {it.content.slice(0, 260)}
                  {it.content.length > 260 ? "…" : ""}
                </p>
              </div>
              <button
                onClick={() => onUseReference(it.content)}
                className="shrink-0 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent"
                title="Usar como base"
              >
                <FileText className="h-3 w-3" /> Usar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
