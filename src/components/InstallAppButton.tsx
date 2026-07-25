import { useEffect, useState } from "react";
import { Download, Check } from "lucide-react";
import { onInstallAvailable, promptInstall, isStandalone } from "@/lib/pwa";
import { toast } from "sonner";

export function InstallAppButton() {
  const [available, setAvailable] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    return onInstallAvailable(setAvailable);
  }, []);

  if (installed) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
        <Check className="h-4 w-4" /> App instalado
      </div>
    );
  }

  if (!available) return null;

  return (
    <button
      onClick={async () => {
        const r = await promptInstall();
        if (r === "accepted") toast.success("App instalado com sucesso");
        else if (r === "dismissed") toast.info("Instalação cancelada");
      }}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
    >
      <Download className="h-4 w-4" /> Instalar aplicativo
    </button>
  );
}
