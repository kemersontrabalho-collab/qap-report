// Impressão/PDF do boletim: monta um documento limpo em uma janela separada.
// Antes o app prometia "exportação em PDF" no tutorial, mas nenhum botão existia.

import { partyLine, seizedLine, type InvolvedParty, type SeizedItem } from "./bulletin-extras";

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
  seizedItems?: SeizedItem[];
  involvedParties?: InvolvedParty[];
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
  h2 { font-size: 13px; text-transform: uppercase; margin: 14px 0 0; }
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
${(() => {
  const seized = (data.seizedItems ?? []).filter((i) => i.description?.trim());
  const parties = (data.involvedParties ?? []).filter((p) => p.name?.trim());
  let out = "";
  if (parties.length) out += `<h2>Envolvidos</h2><table>${parties.map((p) => `<tr><td>${esc(partyLine(p))}</td></tr>`).join("")}</table>`;
  if (seized.length) out += `<h2>Materiais apreendidos</h2><table>${seized.map((i) => `<tr><td>${esc(seizedLine(i))}</td></tr>`).join("")}</table>`;
  return out;
})()}
<pre>${esc(data.content)}</pre>
<style>.qap-bar{position:sticky;top:0;display:flex;gap:8px;justify-content:space-between;padding:10px;margin:-10px -10px 16px;background:#0f1d33;z-index:9}.qap-bar button{font:600 15px system-ui,sans-serif;padding:10px 16px;border-radius:8px;border:0;cursor:pointer}.qap-back{background:#fff;color:#0f1d33}.qap-print{background:#3b82f6;color:#fff}@media print{.qap-bar{display:none!important}}</style>
<script>
(function(){var bar=document.createElement('div');bar.className='qap-bar';
bar.innerHTML='<button class="qap-back" type="button">← Voltar ao boletim</button><button class="qap-print" type="button">Salvar PDF</button>';
document.body.insertBefore(bar,document.body.firstChild);
bar.querySelector('.qap-back').onclick=function(){try{window.close();}catch(e){}setTimeout(function(){if(window.opener){try{window.opener.focus();}catch(e){}}else{history.back();}},150);};
bar.querySelector('.qap-print').onclick=function(){window.print();};})();
window.onload=function(){window.focus();window.print();};
${"<"}/script>
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
