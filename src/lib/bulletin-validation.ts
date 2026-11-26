import { finalizeBulletinText } from "./bulletin-text";

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function matchesBulletinSearch(b: { title: string; category: string | null; content: string | null; created_at: string }, search: string): boolean {
  const term = normalizeSearch(search);
  return [b.title, b.category ?? "", b.content ?? "", new Date(b.created_at).toLocaleDateString("pt-BR")]
    .some((value) => normalizeSearch(value).includes(term));
}

export function hasBulletinNarrative(content: string | null | undefined): boolean {
  const narrative = finalizeBulletinText(content)
    .replace(/^\s*(?:t[ií]tulo(?: do boletim)?\s*:.*|hist[óo]rico(?:\s*\/\s*vers[ãa]o policial)?\s*:?|garantias legais\s*:?|tipifica[çc][ãa]o legal\s*:?)\s*$/gim, "");
  return /[a-záéíóúâêôãõç]/i.test(narrative);
}

export function procedureFacts(content: string) {
  const t = normalizeSearch(finalizeBulletinText(content));
  const noHandcuffs = /(?:sem (?:uso (?:de )?)?algemas|nao (?:houve|foi|foram|se|necessitou|utiliz)[^.!?\n]{0,90}algem|algemas[^.!?\n]{0,40}nao (?:foram|foram utilizadas|se aplic))/.test(t);
  const noArrest = /(?:sem prisao|nao houve prisao|nao (?:foi|foram) pres[oa]|nao ha(?:ver)? prisao|por nao haver prisao)/.test(t);
  const positive = t.split(/[.!?\n]+/).filter((s) => !/\b(?:nao|sem)\b/.test(s)).join(". ");
  return {
    noHandcuffs,
    noArrest,
    handcuffs: /(?:algemad[oa]|(?:uso|emprego) (?:de )?algemas (?:foi|foram|ocorreu)|algemas (?:foram|foi) (?:empregad|utilizad)|(?:utilizou|empregou|utilizadas|empregadas)[^.!?\n]{0,30}algemas)/.test(positive),
    arrest: /(?:foi|foram|restou|recebeu voz de) (?:pres[oa]|prisao)|prisao (?:em flagrante|foi efetuada)|efetuou a prisao/.test(positive),
    rights: /(?:informad[oa]s?|cientificad[oa]s?|comunicad[oa]s?|lidos)[^.!?\n]{0,90}direitos|direitos[^.!?\n]{0,60}(?:informad|cientificad|comunicad|lidos)/.test(t),
  };
}

export function narrativeContradictions(content: string): string[] {
  const f = procedureFacts(content);
  // Include affirmative boilerplate even when the same sentence later says it doesn't apply.
  const t = normalizeSearch(finalizeBulletinText(content));
  const affirmativeCuffs = f.handcuffs || /(?:uso|emprego) (?:de )?algemas foi empregado/.test(t);
  const issues: string[] = [];
  if (f.noHandcuffs && affirmativeCuffs) issues.push("O histórico afirma e nega o uso de algemas.");
  if (f.noArrest && (f.arrest || f.rights)) issues.push("O histórico nega prisão, mas descreve prisão ou comunicação dos direitos do preso.");
  return issues;
}

export function validateGeneratedNarrative(content: string, source: string, supportCrew?: string): void {
  const original = procedureFacts(source);
  const generated = procedureFacts(content);
  const errors = narrativeContradictions(content);
  if (original.noHandcuffs && generated.handcuffs) errors.push("Uso de algemas contrário ao relato.");
  if (original.noArrest && (generated.arrest || generated.rights)) errors.push("Prisão ou direitos do preso contrários ao relato.");
  if (!supportCrew?.trim() && /\b(?:apoio|reforco|guarnicao de apoio)\b/.test(normalizeSearch(finalizeBulletinText(content)))) errors.push("Apoio não informado.");
  if (errors.length) throw new Error("O texto gerado contém procedimentos incompatíveis com o relato e não foi aplicado. Revise os dados e gere novamente.");
}