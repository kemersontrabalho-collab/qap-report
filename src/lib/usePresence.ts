import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Marca o usuário logado como "online" atualizando profiles.last_seen_at
 * periodicamente (e quando a aba volta ao foco). O painel do criador usa esse
 * carimbo para mostrar Online/Offline.
 *
 * Detalhes de robustez:
 * - usa getSession() (leitura local) em vez de getUser() (chamada de rede a
 *   cada minuto), evitando tráfego desnecessário e falhas quando sem internet;
 * - ignora batimentos enquanto a aba está oculta;
 * - protege contra execuções concorrentes (visibilitychange + intervalo).
 */
export function usePresence(intervalMs = 60_000) {
  useEffect(() => {
    let cancelled = false;
    let running = false;

    async function ping() {
      if (cancelled || running) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      running = true;
      try {
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id;
        if (!uid || cancelled) return;
        await supabase
          .from("profiles")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", uid);
      } catch {
        // Presença é best-effort: falha de rede não deve quebrar a navegação.
      } finally {
        running = false;
      }
    }

    void ping();
    const id = setInterval(() => void ping(), intervalMs);
    const onVisible = () => void ping();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [intervalMs]);
}
