import { describe, expect, it } from "vitest";
import { signupConsent, TERMS_VERSION } from "./terms-consent";

describe("aceite obrigatório no cadastro", () => {
  it("recusa cadastro sem aceite", () => {
    expect(() => signupConsent(false)).toThrow("É obrigatório ler e aceitar");
  });
  it("registra aceite explícito e versão do termo", () => {
    expect(signupConsent(true)).toEqual({ terms_accepted: true, terms_version: TERMS_VERSION });
  });
});