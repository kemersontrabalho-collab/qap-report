export type DevicePermission = "location" | "camera" | "microphone" | "notifications";
export type DevicePermissionState = PermissionState | "unknown" | "unsupported";
export type RememberedDevicePermissions = Partial<Record<DevicePermission, "granted">>;
type PermissionStorage = Pick<Storage, "getItem" | "setItem">;

const STORAGE_KEY = "qap-report.device-permissions.v1";
const KINDS: DevicePermission[] = ["location", "camera", "microphone", "notifications"];

function getStorage(storage?: PermissionStorage): PermissionStorage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Lê somente autorizações concedidas neste navegador; nunca solicita acesso. */
export function readRememberedDevicePermissions(storage?: PermissionStorage): RememberedDevicePermissions {
  try {
    const raw = getStorage(storage)?.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const values = parsed as Record<string, unknown>;
    return Object.fromEntries(
      KINDS.filter((kind) => values[kind] === "granted").map((kind) => [kind, "granted"]),
    );
  } catch {
    return {};
  }
}

/** O estado explícito do aparelho sempre substitui a última autorização lembrada. */
export function rememberDevicePermissionState(
  kind: DevicePermission,
  state: DevicePermissionState,
  storage?: PermissionStorage,
): void {
  const target = getStorage(storage);
  if (!target) return;
  try {
    const remembered = readRememberedDevicePermissions(target);
    if (state === "granted") remembered[kind] = "granted";
    else if (state !== "unknown") delete remembered[kind];
    else return;
    target.setItem(STORAGE_KEY, JSON.stringify(remembered));
  } catch {
    // O navegador pode bloquear armazenamento; a permissão real continua valendo.
  }
}

/** Safari nem sempre permite consultar câmera/microfone após autorizar. */
export function restoreRememberedDevicePermission(
  kind: DevicePermission,
  state: DevicePermissionState,
  remembered: RememberedDevicePermissions,
): DevicePermissionState {
  return state === "unknown" && remembered[kind] === "granted" ? "granted" : state;
}

export async function readDevicePermission(kind: DevicePermission): Promise<DevicePermissionState> {
  if (kind === "notifications") {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission === "default" ? "prompt" : Notification.permission;
  }
  if (kind === "location" && !navigator.geolocation) return "unsupported";
  if (kind !== "location" && !navigator.mediaDevices?.getUserMedia) return "unsupported";
  try {
    const name = kind === "location" ? "geolocation" : kind;
    const result = await navigator.permissions.query({ name: name as PermissionName });
    return result.state;
  } catch {
    // Safari can request a permission without being able to query its state.
    return "unknown";
  }
}

export async function requestMediaPermission(
  mediaDevices: Pick<MediaDevices, "getUserMedia">,
  kind: "camera" | "microphone",
): Promise<void> {
  const stream = await mediaDevices.getUserMedia(
    kind === "camera" ? { video: { facingMode: "environment" }, audio: false } : { audio: true, video: false },
  );
  // Checking permission must never leave the camera or microphone running.
  stream.getTracks().forEach((track) => track.stop());
}