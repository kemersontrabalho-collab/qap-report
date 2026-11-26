// Guarded PWA service-worker registration + install-prompt manager.
// Follows Lovable's PWA skill: never register in dev/preview/iframe and
// always support `?sw=off` as a kill switch.

export async function registerPWA(): Promise<void> {
  // Do not register new app-shell workers during the cleanup release.
  // Existing registrations fetch the same-path replacement worker via update().
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.allSettled(regs.filter((r) => {
      const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL;
      return url && new URL(url).pathname === "/sw.js";
    }).map((r) => r.update()));
  } catch (err) {
    console.warn("[pwa] registration failed", err);
  }
}

// ---- Install prompt manager ----
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedFlag = false;
const listeners = new Set<(available: boolean) => void>();
const installedListeners = new Set<(installed: boolean) => void>();

export function initInstallPrompt() {
  if (typeof window === "undefined") return;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    listeners.forEach((cb) => cb(true));
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installedFlag = true;
    listeners.forEach((cb) => cb(false));
    installedListeners.forEach((cb) => cb(true));
  });
}

export function onInstallAvailable(cb: (available: boolean) => void): () => void {
  listeners.add(cb);
  cb(deferredPrompt !== null);
  return () => {
    listeners.delete(cb);
  };
}

export function onInstalled(cb: (installed: boolean) => void): () => void {
  installedListeners.add(cb);
  cb(installedFlag || isStandalone());
  return () => {
    installedListeners.delete(cb);
  };
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  await deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((cb) => cb(false));
  return choice.outcome;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(mq || iosStandalone);
}
