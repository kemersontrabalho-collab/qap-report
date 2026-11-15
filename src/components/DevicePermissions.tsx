import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Camera, Clipboard, FolderOpen, Loader2, MapPin, Mic, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { readDevicePermission, requestMediaPermission, type DevicePermission, type DevicePermissionState } from "@/lib/device-permissions";

const permissions = [
  { kind: "location", label: "Localização", icon: MapPin },
  { kind: "camera", label: "Câmera", icon: Camera },
  { kind: "microphone", label: "Microfone", icon: Mic },
  { kind: "notifications", label: "Notificações", icon: BellRing },
] as const;

const labels: Record<DevicePermissionState, string> = {
  granted: "Permitido", denied: "Bloqueado", prompt: "Não solicitado",
  unknown: "Não informado pelo aparelho", unsupported: "Indisponível neste navegador",
};

export function DevicePermissions() {
  const [states, setStates] = useState<Partial<Record<DevicePermission, DevicePermissionState>>>({});
  const [busy, setBusy] = useState<DevicePermission | null>(null);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    const values = await Promise.all(permissions.map(async ({ kind }) => [kind, await readDevicePermission(kind)] as const));
    setStates(Object.fromEntries(values));
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  async function request(kind: DevicePermission) {
    if (pending.current) return;
    pending.current = true;
    setBusy(kind);
    let result: DevicePermissionState | undefined;
    try {
      if (kind === "location") {
        await new Promise<void>((resolve, reject) => navigator.geolocation.getCurrentPosition(
          () => resolve(), reject, { timeout: 15000, maximumAge: 60000, enableHighAccuracy: false },
        ));
        result = "granted";
      } else if (kind === "camera" || kind === "microphone") {
        await requestMediaPermission(navigator.mediaDevices, kind);
        result = "granted";
      } else {
        const permission = await Notification.requestPermission();
        result = permission === "default" ? "prompt" : permission;
      }
      if (result === "granted") toast.success("Permissão concedida neste aparelho.");
      if (result === "denied") toast.info("Permissão bloqueada. Altere nas configurações do navegador ou do aparelho.");
    } catch (error) {
      const denied = error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "PermissionDeniedError")
        || (kind === "location" && typeof error === "object" && error !== null && "code" in error && error.code === 1);
      if (denied) result = "denied";
      toast.error(denied
        ? "Permissão bloqueada. Altere nas configurações do navegador ou do aparelho."
        : "Não foi possível acessar o recurso. Verifique se está disponível e tente novamente.");
    } finally {
      await refresh();
      if (result) setStates((previous) => ({ ...previous, [kind]: result }));
      pending.current = false;
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="device-permissions-title" className="min-w-0 py-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="device-permissions-title" className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4 shrink-0" /> Permissões do aparelho</h2>
        <Button variant="ghost" size="icon" onClick={() => void refresh()} aria-label="Atualizar permissões" title="Atualizar permissões"><RefreshCw className="h-4 w-4" /></Button>
      </div>
      <div className="mt-3 divide-y divide-border">
        {permissions.map(({ kind, label, icon: Icon }) => {
          const state = states[kind];
          return <div key={kind} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0"><h3 className="text-sm font-medium">{label}</h3><p role="status" className="mt-1 text-xs text-muted-foreground">{state ? labels[state] : "Verificando…"}</p></div>
            </div>
            <Button variant="outline" disabled={busy !== null || !state || state === "granted" || state === "unsupported" || state === "denied"} onClick={() => void request(kind)} aria-label={`Permitir ${label.toLowerCase()}`}>
              {busy === kind && <Loader2 className="h-4 w-4 animate-spin" />}{state === "granted" ? "Permitido" : state === "denied" ? "Bloqueado" : "Permitir"}
            </Button>
          </div>;
        })}
        <div className="flex items-center gap-3 py-4"><FolderOpen className="h-5 w-5 shrink-0 text-muted-foreground" /><div><h3 className="text-sm font-medium">Fotos e arquivos</h3><p className="mt-1 text-xs text-muted-foreground">Acesso somente ao arquivo escolhido por você.</p></div></div>
        <div className="flex items-center gap-3 py-4"><Clipboard className="h-5 w-5 shrink-0 text-muted-foreground" /><div><h3 className="text-sm font-medium">Área de transferência</h3><p className="mt-1 text-xs text-muted-foreground">Autorização ao copiar, quando exigida pelo navegador. O app não lê sua área de transferência.</p></div></div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Permissões valem para este aparelho. Para revogar ou liberar um acesso bloqueado, use as configurações do site no navegador ou do app no aparelho. No iPhone, notificações podem exigir o app adicionado à Tela de Início. A autorização não ativa alertas com o app fechado.</p>
    </section>
  );
}