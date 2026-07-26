import { useSyncExternalStore } from "react";

let open = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
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
};

export function useTutorialOpen() {
  return useSyncExternalStore(tutorialStore.subscribe, tutorialStore.getSnapshot, () => false);
}
