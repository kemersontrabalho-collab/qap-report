import { supabase } from "@/integrations/supabase/client";

const KEY = "qap.session-expires-at";
const HOUR = 60 * 60 * 1000;

// Duração da sessão: com "Manter conectado" o usuário fica logado por 8h;
// sem marcar, a sessão dura 45 min (suficiente para o plantão imediato).
const KEEP_MS = 8 * HOUR;
const SHORT_MS = 45 * 60 * 1000;

export function setSessionLifetime(keep: boolean) {
  try {
    const expiresAt = Date.now() + (keep ? KEEP_MS : SHORT_MS);
    localStorage.setItem(KEY, String(expiresAt));
  } catch {
    /* ignore */
  }
}

export function clearSessionLifetime() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** Se a sessão local expirou, encerra a sessão do Supabase. */
export async function enforceSessionLifetime(): Promise<boolean> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const expiresAt = Number(raw);
    if (!Number.isFinite(expiresAt)) {
      localStorage.removeItem(KEY);
      return false;
    }
    if (Date.now() >= expiresAt) {
      localStorage.removeItem(KEY);
      await supabase.auth.signOut();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
