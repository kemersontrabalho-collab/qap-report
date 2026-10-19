// Guarda o destino pretendido durante o fluxo OAuth (Google/Apple).
// Em redirect de página inteira o app é recarregado e o estado do React se perde,
// por isso o caminho fica em sessionStorage e é consumido após a sessão existir.

const KEY = "qap.oauth-redirect";

function isSafePath(path: string | null | undefined): path is string {
  if (
    typeof path !== "string" ||
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\u0000-\u0020\u007f]/.test(path)
  ) {
    return false;
  }
  try {
    const base = new URL("https://oauth-redirect.invalid");
    return new URL(path, base).origin === base.origin;
  } catch {
    return false;
  }
}

export function storeOAuthRedirect(path: string) {
  try {
    if (isSafePath(path)) sessionStorage.setItem(KEY, path);
    else sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function consumeOAuthRedirect(fallback = "/dashboard"): string {
  const safeFallback = isSafePath(fallback) ? fallback : "/dashboard";
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return isSafePath(value) ? value : safeFallback;
  } catch {
    return safeFallback;
  }
}
