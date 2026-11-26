import { expect, it } from "vitest";
import { hasBulletinNarrative, matchesBulletinSearch, narrativeContradictions, validateGeneratedNarrative } from "./bulletin-validation";

it("impede conclusão sem histórico, inclusive só cabeçalho, perguntas ou marcadores", () => {
  for (const text of ["", "  ", "Título do Boletim: Furto\nHISTÓRICO / VERSÃO POLICIAL\n{RELATO}\nPERGUNTAS COMPLEMENTARES:\nO que ocorreu?"]) expect(hasBulletinNarrative(text)).toBe(false);
  expect(hasBulletinNarrative("HISTÓRICO / VERSÃO POLICIAL\nA vítima relatou o furto de sua bicicleta.")).toBe(true);
});
it("busca trecho do histórico sem acentos em ambas as direções", () => {
  const b = { title: "Teste", category: "Averiguação", content: "A vítima relatou subtração de bicicleta.", created_at: "2026-11-25T12:00:00Z" };
  expect(matchesBulletinSearch(b, "subtracao de bicicleta")).toBe(true);
  expect(matchesBulletinSearch({ ...b, content: "subtracao" }, "subtração")).toBe(true);
  expect(matchesBulletinSearch(b, "roubo de carro")).toBe(false);
});
it("detecta a contradição de algemas encontrada na revisão", () => {
  expect(narrativeContradictions("Não houve necessidade de emprego de algemas. O uso de algemas foi empregado estritamente nos termos da Súmula Vinculante nº 11 do STF não se aplicando ao caso concreto.")).toHaveLength(1);
});
it("não aplica direitos do preso e prisão quando o relato explicitamente os nega", () => {
  expect(() => validateGeneratedNarrative("Foram informados ao indivíduo seus direitos constitucionais.", "Não houve prisão.")).toThrow();
  expect(narrativeContradictions("Não houve prisão. Foram informados os direitos constitucionais ao indivíduo.")).toHaveLength(1);
});
it("não menciona apoio quando o campo está vazio", () => {
  expect(() => validateGeneratedNarrative("Não houve acionamento de apoio.", "A vítima foi orientada.", "")).toThrow();
  expect(() => validateGeneratedNarrative("A vítima foi orientada.", "A vítima foi orientada.", "")).not.toThrow();
});
it("preserva prisão, algemas e apoio efetivamente relatados", () => {
  const text = "O autor foi preso em flagrante. O uso de algemas foi empregado diante da resistência. Foram informados os direitos constitucionais. A guarnição de apoio auxiliou na condução.";
  expect(() => validateGeneratedNarrative(text, text, "Guarnição de apoio auxiliou na condução")).not.toThrow();
  expect(narrativeContradictions(text)).toEqual([]);
});