import { describe, expect, it } from "vitest";
import { finalizeBulletinText, stripMarkdown } from "./bulletin-text";

describe("finalizeBulletinText", () => {
  it("remove a seção PERGUNTAS COMPLEMENTARES ao concluir", () => {
    const text = `Título do Boletim: Furto

HISTÓRICO / VERSÃO POLICIAL
Trata-se de ocorrência de furto.

PERGUNTAS COMPLEMENTARES:
- Qual foi a composição da guarnição?
- Houve testemunhas?`;
    const out = finalizeBulletinText(text);
    expect(out).not.toMatch(/PERGUNTAS/i);
    expect(out).not.toContain("Houve testemunhas?");
    expect(out).toContain("Trata-se de ocorrência de furto.");
  });

  it("remove o título das perguntas mesmo em markdown/minúsculas e mantém seções seguintes", () => {
    const text = `Texto.\n\n**Perguntas complementares:**\n1. Qual o nome?\n\nTIPIFICAÇÃO LEGAL\nArt. 155 do CP.`;
    const out = finalizeBulletinText(text);
    expect(out).not.toMatch(/perguntas/i);
    expect(out).not.toContain("Qual o nome?");
    expect(out).toContain("Art. 155 do CP.");
  });

  it("remove marcadores {DADO AUSENTE} e asteriscos", () => {
    const out = finalizeBulletinText("**Título do Boletim:** Ameaça\nGuarnição {COMPOSIÇÃO DA GUARNIÇÃO} chegou.");
    expect(out).not.toContain("*");
    expect(out).not.toContain("{");
    expect(out).toContain("Título do Boletim: Ameaça");
  });
});

describe("stripMarkdown", () => {
  it("tira asteriscos e # do texto gerado", () => {
    expect(stripMarkdown("## HISTÓRICO\n**Trata-se** de *ameaça*")).toBe("HISTÓRICO\nTrata-se de ameaça");
  });
});
