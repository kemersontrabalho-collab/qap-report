import { supabase } from "@/integrations/supabase/client";

const KEY = "qap.session-expires-at";
const PREF_KEY = "qap.keep-signed-in";
const TAB_KEY = "qap.session-tab-open";
const HOUR = 60 * 60 * 1000;

// Com "Manter conectado" o usuário fica logado por 8 horas ininterruptas.
// Sem marcar, a sessão dura enquanto a aba estiver aberta (encerra ao fechar a aba/navegador).
const KEEP_MS = 8 * HOUR;

export function getKeepSignedInPreference(): boolean {
  try {
    const v = localStorage.getItem(PREF_KEY);
    // Padrão = true (facilita o login para o próximo turno de plantão).
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setSessionLifetime(keep: boolean) {
  try {
    localStorage.setItem(PREF_KEY, keep ? "1" : "0");
    if (keep) {
      const expiresAt = Date.now() + KEEP_MS;
      localStorage.setItem(KEY, String(expiresAt));
      sessionStorage.removeItem(TAB_KEY);
    } else {
      // Sessão apenas enquanto a aba viver: marca a aba atual.
      localStorage.removeItem(KEY);
      sessionStorage.setItem(TAB_KEY, "1");
    }
  } catch {
    /* ignore */
  }
}

export function clearSessionLifetime() {
  try {
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(TAB_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Encerra a sessão do Supabase se:
 *  - a expiração de 8h foi atingida (modo "Manter conectado"), ou
 *  - o usuário optou por sessão temporária e abriu o app numa NOVA aba
 *    (sessionStorage não persiste entre abas/janelas).
 * Não faz nada se o usuário nunca fez login neste dispositivo.
 */
export async function enforceSessionLifetime(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;

    const expiresRaw = localStorage.getItem(KEY);
    if (expiresRaw) {
      const expiresAt = Number(expiresRaw);
      if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
        clearSessionLifetime();
        await supabase.auth.signOut();
        return true;
      }
      return false;
    }

    // Sem expiração persistida: só encerra se o usuário escolheu sessão temporária
    // E a aba atual não é a que iniciou a sessão.
    const pref = localStorage.getItem(PREF_KEY);
    if (pref === "0" && !sessionStorage.getItem(TAB_KEY)) {
      await supabase.auth.signOut();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
