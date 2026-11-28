export const TERMS_VERSION = "2026-11-28";

export function signupConsent(accepted: boolean) {
  if (!accepted) {
    throw new Error("É obrigatório ler e aceitar o Termo de Responsabilidade para criar sua conta.");
  }
  return { terms_accepted: true, terms_version: TERMS_VERSION };
}