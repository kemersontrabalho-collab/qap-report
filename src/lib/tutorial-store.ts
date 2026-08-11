import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/**
 * Chave por usuário: o tutorial é "primeira vez por conta", não por navegador.
 * Assim quem entra com outra conta no mesmo dispositivo também vê o tour.
 */
function seenKey(userId: string) {
  return `qap:tutorial-seen:${userId}`;
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

  hasSeen: (userId: string) => {
    if (typeof window === "undefined") return true;
    try {
      return window.localStorage.getItem(seenKey(userId)) === "1";
    } catch {
      return false;
    }
  },
  markSeen: (userId: string) => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(seenKey(userId), "1");
    } catch {
      /* modo privado: apenas ignora */
    }
  },
  /** Abre o tour automaticamente no primeiro acesso da conta. */
  openIfFirstTime: (userId: string) => {
    if (tutorialStore.hasSeen(userId)) return;
    tutorialStore.markSeen(userId);
    tutorialStore.open();
  },
};

export function useTutorialOpen() {
  return useSyncExternalStore(tutorialStore.subscribe, tutorialStore.getSnapshot, () => false);
}
