// Tipos e formatadores de apreensões, envolvidos, resumo para WhatsApp e
// verificação jurídica local (sem rede).

export type SeizedKind = "arma" | "entorpecente" | "dinheiro" | "eletronico" | "outro";
export type SeizedItem = {
  id: string;
  kind: SeizedKind;
  description: string; // tipo/modelo/substância
  quantity?: string;
  details?: string; // calibre, peso, formato, marca
  serial?: string; // numeração ou IMEI
};

export type PartyRole = "vitima" | "autor" | "testemunha" | "condutor" | "outro";
export type InvolvedParty = {
  id: string;
  role: PartyRole;
  name: string;
  rg?: string;
  cpf?: string;
  birthDate?: string;
  motherName?: string;
};

export const SEIZED_LABEL: Record<SeizedKind, string> = {
  arma: "Arma/Munição",
  entorpecente: "Entorpecente",
  dinheiro: "Dinheiro",
  eletronico: "Celular/Eletrônico",
  outro: "Outro",
};
export const ROLE_LABEL: Record<PartyRole, string> = {
  vitima: "Vítima",
  autor: "Autor",
  testemunha: "Testemunha",
  condutor: "Condutor",
  outro: "Outro",
};

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

export function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

export function seizedLine(i: SeizedItem): string {
  const parts = [
    i.quantity?.trim(),
    i.description?.trim(),
    i.details?.trim() && `(${i.details.trim()})`,
    i.serial?.trim() && `nº ${i.serial.trim()}`,
  ].filter(Boolean);
  return `${SEIZED_LABEL[i.kind]}: ${parts.join(" ")}`;
}

export function seizedToText(items: SeizedItem[]): string {
  return items
    .filter((i) => i.description?.trim())
    .map((i) => `• ${seizedLine(i)}`)
    .join("\n");
}

export function partyLine(p: InvolvedParty): string {
  const extra = [
    p.rg?.trim() && `RG ${p.rg.trim()}`,
    p.cpf?.trim() && `CPF ${p.cpf.trim()}`,
    p.birthDate?.trim() && `nasc. ${p.birthDate.trim()}`,
    p.motherName?.trim() && `mãe ${p.motherName.trim()}`,
  ].filter(Boolean);
  return `${ROLE_LABEL[p.role]}: ${p.name.trim()}${extra.length ? ` — ${extra.join(", ")}` : ""}`;
}

export function partiesToText(parties: InvolvedParty[]): string {
  return parties
    .filter((p) => p.name?.trim())
    .map((p) => `• ${partyLine(p)}`)
    .join("\n");
}

type WaInput = {
  bulletinType: string;
  category: string | null;
  title: string;
  occurrenceAt: string | null;
  occurrenceAddress: string | null;
  crewComposition: string | null;
  vehiclePrefix: string | null;
  supportCrew: string | null;
  seized: SeizedItem[];
  content: string;
};

function synthesis(content: string): string {
  const clean = content
    .replace(/\{[^{}]*\}/g, "")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/\*+/g, "");
  const paras = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 60 && !/^t[ií]tulo do boletim/i.test(p) && !/^hist[óo]rico/i.test(p));
  const first = paras[0] ?? "";
  return first.length > 700 ? `${first.slice(0, 700).trimEnd()}…` : first;
}

export function formatWhatsApp(d: WaInput): string {
  const when = d.occurrenceAt
    ? new Date(d.occurrenceAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : null;
  const guarnicao = [d.vehiclePrefix && `VTR ${d.vehiclePrefix}`, d.crewComposition]
    .filter(Boolean)
    .join(" — ");
  const lines = [
    "*🚨 QAP REPORT — RESUMO OPERACIONAL*",
    `*OCORRÊNCIA:* ${d.category || d.title} (${d.bulletinType})`,
    when && `*DATA/HORA:* ${when}`,
    d.occurrenceAddress && `*LOCAL:* ${d.occurrenceAddress}`,
    guarnicao && `*GUARNIÇÃO:* ${guarnicao}`,
    d.supportCrew?.trim() && `*APOIO:* ${d.supportCrew.trim()}`,
  ].filter(Boolean) as string[];
  const seized = d.seized.filter((i) => i.description?.trim());
  if (seized.length) {
    lines.push("", "*APREENSÃO:*", ...seized.map((i) => `• ${seizedLine(i)}`));
  }
  const s = synthesis(d.content);
  if (s) lines.push("", "*SÍNTESE DO FATO:*", s);
  return lines.join("\n");
}

// ---- Verificação jurídica local (instantânea, sem IA) ----
export type LocalCheck = { id: string; title: string; suggestion: string };

export function localLegalChecks(content: string): LocalCheck[] {
  const t = content.toLowerCase();
  const out: LocalCheck[] = [];
  if (/atitude suspeita|em atitude suspeita|comportamento suspeito|nervosismo/.test(t)) {
    out.push({
      id: "suspeita",
      title: "Fundada suspeita genérica",
      suggestion:
        "Substitua por elementos concretos e observáveis: volume sob as vestes, descarte de objeto, fuga ao avistar a guarnição, denúncia específica.",
    });
  }
  if (/(resid[êe]ncia|domic[íi]lio|casa|im[óo]vel)/.test(t) && /(adentr|ingress|entrad|busca domiciliar)/.test(t) && !/(autoriz|consent|franque|flagrante)/.test(t)) {
    out.push({
      id: "domicilio",
      title: "Entrada em domicílio sem justificativa",
      suggestion:
        "Registre a autorização expressa do morador (quem autorizou) ou a situação de flagrante que justificou o ingresso.",
    });
  }
  if (/algem/.test(t) && !/(s[úu]mula vinculante|resist|fuga|integridade)/.test(t)) {
    out.push({
      id: "algemas",
      title: "Uso de algemas sem fundamentação",
      suggestion:
        "Justifique conforme a Súmula Vinculante 11: resistência, fundado receio de fuga ou perigo à integridade física.",
    });
  }
  if (/(apreend|arrecad)/.test(t) && !/(lacr|acondicion|cadeia de cust)/.test(t)) {
    out.push({
      id: "custodia",
      title: "Cadeia de custódia incompleta",
      suggestion: "Informe acondicionamento, lacre e destino dos materiais apreendidos (Lei 13.964/19).",
    });
  }
  if (/(pres[oa]|pris[ãa]o|conduzid)/.test(t) && !/(direito|sil[êe]ncio|lxiii)/.test(t)) {
    out.push({
      id: "direitos",
      title: "Leitura de direitos não registrada",
      suggestion: "Registre que foram informados os direitos constitucionais (Art. 5º, LXIII, CF/88).",
    });
  }
  return out;
}
