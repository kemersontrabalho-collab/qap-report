// Limpeza do texto dos boletins (compartilhado entre editor, conclusão,
// cópia, WhatsApp e PDF).

/** Remove marcações markdown (# títulos, **negrito**, *itálico*, bullets com *). */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/\*+/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

// Seções que podem vir depois das perguntas e devem ser preservadas.
const KEEP_HEADING =
  /^\s*(HIST[ÓO]RICO|GARANTIAS\s+LEGAIS|TIPIFICA[ÇC][ÃA]O|OBSERVA[ÇC][ÕO]ES|ENCAMINHAMENTO|MATERIAIS\s+APREENDIDOS)\b/i;
// Cabeçalho da seção de perguntas (aceita markdown, maiúsculas/minúsculas e variações).
const QUESTIONS_HEADING =
  /^\s*(PERGUNTAS\s+COMPLEMENTARES|PERGUNTAS\s+PENDENTES|DADOS\s+FALTANTES|INFORMA[ÇC][ÕO]ES\s+FALTANTES|INFORMA[ÇC][ÕO]ES\s+COMPLEMENTARES\s+NECESS[ÁA]RIAS)\b/i;

/** Remove a(s) seção(ões) "PERGUNTAS COMPLEMENTARES" e todo o seu conteúdo. */
export function removeComplementaryQuestions(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const plain = line.replace(/[#*_>]/g, "").trim();
    if (QUESTIONS_HEADING.test(plain)) {
      skipping = true;
      continue;
    }
    if (skipping && KEEP_HEADING.test(plain)) skipping = false;
    if (!skipping) out.push(line);
  }
  return out.join("\n");
}

/** Texto final do boletim concluído/exportado: sem perguntas, marcadores {…} nem markdown. */
export function finalizeBulletinText(text: string | null | undefined): string {
  if (!text) return "";
  return stripMarkdown(removeComplementaryQuestions(text).replace(/\{[^{}]*\}/g, ""))
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.;:])/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
