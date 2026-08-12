import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Cache local (rápido) + fonte de verdade no banco (profiles.tutorial_seen_at).
 * Assim o tour aparece UMA única vez por conta, em qualquer dispositivo — nos
 * acessos seguintes só abre se o usuário clicar em Configurações → Tutorial.
 */
function seenKey(userId: string) {
  return `qap:tutorial-seen:${userId}`;
}

function readLocal(userId: string) {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(seenKey(userId)) === "1";
  } catch {
    return false;
  }
}

function writeLocal(userId: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenKey(userId), "1");
  } catch {
    /* modo privado: apenas ignora */
  }
}

export const tutorialStore = {
  open: () => {
    open = true;
    emit();
  },
  close: () => {
    open = false;
    emit();
  },
  subscribe: (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  getSnapshot: () => open,

  hasSeen: (userId: string) => readLocal(userId),
  markSeen: async (userId: string) => {
    writeLocal(userId);
    try {
      await supabase
        .from("profiles")
        .update({ tutorial_seen_at: new Date().toISOString() })
        .eq("id", userId);
    } catch {
      /* offline/erro de rede: o cache local já evita repetição neste aparelho */
    }
  },

  /**
   * Abre o tour somente no primeiríssimo acesso da conta.
   * Marca como visto ANTES de abrir para que recarregar a página não reabra.
   */
  openIfFirstTime: async (userId: string) => {
    if (readLocal(userId)) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("tutorial_seen_at")
      .eq("id", userId)
      .maybeSingle();
    // Em caso de erro de leitura, não arriscamos reabrir o tour repetidamente.
    if (error) {
      writeLocal(userId);
      return;
    }
    if (data?.tutorial_seen_at) {
      writeLocal(userId);
      return;
    }
    await tutorialStore.markSeen(userId);
    tutorialStore.open();
  },
};

export function useTutorialOpen() {
  return useSyncExternalStore(tutorialStore.subscribe, tutorialStore.getSnapshot, () => false);
}
