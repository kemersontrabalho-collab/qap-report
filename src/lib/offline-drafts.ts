// Fila local (IndexedDB) de alterações de boletins feitas sem sinal.
// Cada boletim guarda apenas o último patch pendente.

const DB = "qap-offline";
const STORE = "pending";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export type PendingPatch = { id: string; patch: Record<string, unknown>; savedAt: number };

export function savePending(id: string, patch: Record<string, unknown>) {
  return tx("readwrite", (s) => s.put({ id, patch, savedAt: Date.now() } satisfies PendingPatch, id));
}
export function getPending(id: string) {
  return tx<PendingPatch | undefined>("readonly", (s) => s.get(id));
}
export function removePending(id: string) {
  return tx("readwrite", (s) => s.delete(id));
}
export function allPending() {
  return tx<PendingPatch[]>("readonly", (s) => s.getAll());
}

export function isNetworkError(e: unknown): boolean {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  const msg = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e);
  return /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
}
