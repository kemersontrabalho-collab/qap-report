import { toast } from "sonner";

/**
 * Copia texto com fallback: `navigator.clipboard` só existe em contexto seguro
 * (HTTPS) e pode ser bloqueado por permissão — sem o fallback o botão "Copiar"
 * simplesmente não fazia nada e o erro virava uma promise rejeitada silenciosa.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* tenta o fallback abaixo */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export async function copyWithFeedback(text: string, successMsg = "Copiado") {
  const ok = await copyToClipboard(text);
  if (ok) toast.success(successMsg);
  else toast.error("Não foi possível copiar. Selecione o texto e copie manualmente.");
  return ok;
}
