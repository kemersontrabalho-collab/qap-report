import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";


const BASE_URL = "https://qap-report.lovable.app";

type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

interface SitemapEntry {
  path: string;
  changefreq?: ChangeFreq;
  priority?: string;
}

/** Rotas que nunca devem entrar no sitemap (exatas). */
const EXCLUDED_PATHS = new Set([
  "/sitemap.xml",
  "/auth",
  "/reset-password",
  "/admin",
  "/not-found",
]);

/** Prefixos excluídos (APIs, internos). */
const EXCLUDED_PREFIXES = ["/api", "/lovable"];

/** Prioridade/frequência por rota; o restante usa o padrão. */
const OVERRIDES: Record<string, Omit<SitemapEntry, "path">> = {
  "/": { changefreq: "weekly", priority: "1.0" },
  "/guia-redacao-tecnica": { changefreq: "weekly", priority: "0.8" },
  "/modelos-boletim-ocorrencia": { changefreq: "weekly", priority: "0.8" },
};

const DEFAULT_ENTRY: Omit<SitemapEntry, "path"> = {
  changefreq: "weekly",
  priority: "0.6",
};

type AnyRoute = {
  id?: string;
  children?: unknown;
};

/** Converte o id gerado ("/_authenticated/settings") no caminho público ("/settings"). */
function idToPath(id: string): string {
  const segments = id
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith("_"));
  return "/" + segments.join("/");
}

function collectRouteIds(route: AnyRoute, acc: string[] = []): string[] {
  if (typeof route.id === "string" && route.id !== "__root__") acc.push(route.id);
  const children = route.children;
  const list = Array.isArray(children)
    ? children
    : children && typeof children === "object"
      ? Object.values(children as Record<string, AnyRoute>)
      : [];
  for (const child of list) collectRouteIds(child as AnyRoute, acc);
  return acc;
}

/**
 * Deriva as entradas do sitemap diretamente da árvore de rotas gerada.
 * Assim, qualquer rota nova entra automaticamente e nenhuma lista manual
 * fica desatualizada.
 */
function buildEntries(): SitemapEntry[] {
  const paths = new Set<string>();

  for (const id of collectRouteIds(routeTree as AnyRoute)) {
    // Rotas dinâmicas/curinga não têm URL pública estável
    if (id.includes("$") || id.includes("*")) continue;

    const path = idToPath(id);
    if (path === "" || EXCLUDED_PATHS.has(path)) continue;
    if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) continue;

    paths.add(path);
  }

  // Garante a home mesmo que a árvore mude de formato
  paths.add("/");

  return [...paths]
    .sort((a, b) => (a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b)))
    .map((path) => ({ path, ...(OVERRIDES[path] ?? DEFAULT_ENTRY) }));
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const urls = buildEntries().map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
