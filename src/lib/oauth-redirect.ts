// Guarda o destino pretendido durante o fluxo OAuth (Google/Apple).
// Em redirect de página inteira o app é recarregado e o estado do React se perde,
// por isso o caminho fica em sessionStorage e é consumido após a sessão existir.

const KEY = "qap.oauth-redirect";

function isSafePath(path: string | null | undefined): path is string {
  return !!path && path.startsWith("/") && !path.startsWith("//");
}

export function storeOAuthRedirect(path: string) {
  try {
    if (isSafePath(path)) sessionStorage.setItem(KEY, path);
  } catch {
    /* ignore */
  }
}

export function consumeOAuthRedirect(fallback = "/dashboard"): string {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return isSafePath(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
