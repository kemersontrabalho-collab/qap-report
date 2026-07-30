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

/**
 * Lista os arquivos de rota em tempo de build. Assim, qualquer rota nova
 * entra automaticamente no sitemap e nenhuma lista manual fica desatualizada.
 */
const ROUTE_FILES = import.meta.glob("./**/*.{ts,tsx}", { eager: false });

/** Converte "./_authenticated/settings.tsx" no caminho público "/settings". */
function fileToPath(file: string): string | null {
  let clean = file.replace(/^\.\//, "").replace(/\.(tsx|ts)$/, "");
  if (clean.startsWith("__root")) return null;
  // Segmentos escapados: "sitemap[.]xml" -> "sitemap.xml"
  clean = clean.replace(/\[(.)\]/g, "$1");

  const segments = clean
    .split("/")
    .flatMap((part) =>
      part.includes(".") && !part.includes("sitemap") ? part.split(".") : [part],
    )
    .filter(Boolean)
    .filter((s) => !s.startsWith("_"))
    .filter((s) => s !== "index" && s !== "route");

  if (segments.some((s) => s.includes("$") || s.includes("*"))) return null;

  return "/" + segments.join("/");
}

function buildEntries(): SitemapEntry[] {
  const paths = new Set<string>();

  for (const file of Object.keys(ROUTE_FILES)) {
    const path = fileToPath(file);
    if (!path || EXCLUDED_PATHS.has(path)) continue;
    if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) continue;
    paths.add(path);
  }

  // Garante a home
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
