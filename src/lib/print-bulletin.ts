// Impressão/PDF do boletim: monta um documento limpo em uma janela separada.
// Antes o app prometia "exportação em PDF" no tutorial, mas nenhum botão existia.

type PrintData = {
  title: string;
  bulletinType: string;
  category: string | null;
  crewComposition: string | null;
  vehiclePrefix: string | null;
  supportCrew?: string | null;
  occurrenceAt: string | null;
  crewAddress: string | null;
  occurrenceAddress: string | null;
  content: string;
};

function esc(v: string | null | undefined): string {
  return String(v ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function printBulletin(data: PrintData): boolean {
  const when = data.occurrenceAt
    ? new Date(data.occurrenceAt).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>${esc(data.title || data.bulletinType)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, "Times New Roman", serif; color:#111; line-height:1.55; }
  h1 { font-size: 18px; margin:0 0 4px; text-transform: uppercase; }
  .tag { font-size: 12px; letter-spacing:.06em; color:#444; }
  table { width:100%; border-collapse: collapse; margin:16px 0; font-size:12px; }
  td { border:1px solid #999; padding:6px 8px; vertical-align: top; }
  td.k { width:34%; background:#f3f3f3; font-weight:bold; text-transform:uppercase; font-size:11px; }
  pre { white-space: pre-wrap; font-family: inherit; font-size:13px; margin:0; text-align: justify; }
</style></head><body>
<div class="tag">${esc(data.bulletinType)}</div>
<h1>${esc(data.title)}</h1>
<table>
  <tr><td class="k">Categoria</td><td>${esc(data.category)}</td></tr>
  <tr><td class="k">Composição da guarnição</td><td>${esc(data.crewComposition)}</td></tr>
  <tr><td class="k">Prefixo da viatura</td><td>${esc(data.vehiclePrefix)}</td></tr>
  ${data.supportCrew && data.supportCrew.trim() ? `<tr><td class="k">Apoio da guarnição</td><td>${esc(data.supportCrew)}</td></tr>` : ""}
  <tr><td class="k">Data e hora</td><td>${esc(when)}</td></tr>
  <tr><td class="k">Localização da guarnição</td><td>${esc(data.crewAddress)}</td></tr>
  <tr><td class="k">Localização da ocorrência</td><td>${esc(data.occurrenceAddress)}</td></tr>
</table>
<pre>${esc(data.content)}</pre>
<script>window.onload=function(){window.focus();window.print();}${"<"}/script>
</body></html>`;

  // Não usar "noopener": com essa flag window.open retorna null e o documento
  // nunca pode ser escrito, quebrando a geração do PDF.
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) return false; // bloqueado por popup blocker
  w.document.open();
  w.document.write(html);
  w.document.close();
  return true;
}
