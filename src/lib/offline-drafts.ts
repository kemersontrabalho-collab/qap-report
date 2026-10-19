// Fila local (IndexedDB) de alterações de boletins feitas sem sinal.
// Cada boletim guarda o patch acumulado das alterações pendentes.

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
    try {
      const t = db.transaction(STORE, mode);
      let result: T;
      t.oncomplete = () => {
        db.close();
        resolve(result);
      };
      t.onabort = () => {
        db.close();
        reject(t.error ?? new Error("A transação de rascunhos offline foi abortada."));
      };
      const r = fn(t.objectStore(STORE));
      r.onsuccess = () => {
        result = r.result;
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
}

export type PendingPatch = { id: string; patch: Record<string, unknown>; savedAt: number };

export async function savePending(id: string, patch: Record<string, unknown>): Promise<IDBValidKey> {
  const db = await open();
  return new Promise((resolve, reject) => {
    try {
      const t = db.transaction(STORE, "readwrite");
      const store = t.objectStore(STORE);
      let failure: unknown;
      t.oncomplete = () => {
        db.close();
        resolve(id);
      };
      t.onabort = () => {
        db.close();
        reject(failure ?? t.error ?? new Error("A transação de rascunhos offline foi abortada."));
      };
      const request = store.get(id);
      request.onsuccess = () => {
        try {
          const previous = request.result as PendingPatch | undefined;
          store.put({
            id,
            patch: { ...(previous?.patch ?? {}), ...patch },
            savedAt: Date.now(),
          } satisfies PendingPatch, id);
        } catch (error) {
          failure = error;
          t.abort();
        }
      };
    } catch (error) {
      db.close();
      reject(error);
    }
  });
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
