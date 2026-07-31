import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Marca o usuário logado como "online" atualizando profiles.last_seen_at
 * periodicamente (e quando a aba volta ao foco). O painel do criador usa esse
 * carimbo para mostrar Online/Offline.
 */
export function usePresence(intervalMs = 60_000) {
  useEffect(() => {
    let cancelled = false;

    async function ping() {
      if (cancelled || typeof document === "undefined") return;
      if (document.visibilityState !== "visible") return;
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      await supabase
        .from("profiles")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", uid);
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
