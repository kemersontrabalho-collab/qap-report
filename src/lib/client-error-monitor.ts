// Client-side error monitor. Sends unhandled exceptions and promise rejections
// to /api/public/log-error. Also exposes reportClientError() for manual logs.

type Payload = {
  category?: "frontend" | "performance";
  severity?: "info" | "warning" | "error" | "critical";
  message: string;
  stack?: string;
  route?: string;
  metadata?: Record<string, unknown>;
};

const RATE_LIMIT_MS = 2000;
const seen = new Map<string, number>();

function shouldSend(key: string) {
  const now = Date.now();
  const last = seen.get(key) ?? 0;
  if (now - last < RATE_LIMIT_MS) return false;
  seen.set(key, now);
  if (seen.size > 200) {
    for (const [k, t] of seen) if (now - t > 60_000) seen.delete(k);
  }
  return true;
}

export function reportClientError(p: Payload): void {
  if (typeof window === "undefined") return;
  const key = `${p.category ?? "frontend"}|${p.message}`.slice(0, 200);
  if (!shouldSend(key)) return;
  const body = JSON.stringify({
    category: p.category ?? "frontend",
    severity: p.severity ?? "error",
    message: p.message.slice(0, 4000),
    stack: p.stack?.slice(0, 8000),
    route: p.route ?? window.location.pathname,
    metadata: p.metadata ?? {},
  });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/public/log-error", blob);
      return;
    }
  } catch {
    /* fallthrough */
  }
  fetch("/api/public/log-error", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => void 0);
}

let installed = false;
export function installClientErrorMonitor(): void {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  window.addEventListener("error", (event) => {
    const err = event.error;
    reportClientError({
      message: event.message || (err instanceof Error ? err.message : "Unknown error"),
      stack: err instanceof Error ? err.stack : undefined,
      metadata: {
        filename: event.filename,
        line: event.lineno,
        col: event.colno,
        mechanism: "window.onerror",
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled promise rejection";
    reportClientError({
      message: msg,
      stack: reason instanceof Error ? reason.stack : undefined,
      metadata: { mechanism: "unhandledrejection" },
    });
  });

  // Performance: slow LCP / long tasks
  try {
    if ("PerformanceObserver" in window) {
      const po = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 3000) {
            reportClientError({
              category: "performance",
              severity: "warning",
              message: `Long task detected (${Math.round(entry.duration)}ms)`,
              metadata: { name: entry.name, duration: entry.duration },
            });
          }
        }
      });
      po.observe({ entryTypes: ["longtask"] });
    }
  } catch {
    /* PerformanceObserver not supported */
  }
}
