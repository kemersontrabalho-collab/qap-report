import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Banner = { text: string; level: "info" | "warning" | "critical"; active: boolean };

/** Aviso global definido pelo administrador (aba Monitoramento → Autocura). */
export function GlobalBanner() {
  const { data } = useQuery({
    queryKey: ["global-banner"],
    queryFn: async (): Promise<Banner | null> => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "global_banner")
        .maybeSingle();
      if (!data?.value) return null;
      try {
        return JSON.parse(data.value) as Banner;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  if (!data?.active || !data.text.trim()) return null;
  const tone =
    data.level === "critical"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : data.level === "warning"
        ? "border-primary/30 bg-accent text-accent-foreground"
        : "border-border bg-muted text-foreground";
  const Icon = data.level === "info" ? Info : AlertTriangle;
  return (
    <div role="status" className={`border-b px-4 py-2 text-sm ${tone}`}>
      <div className="mx-auto flex max-w-5xl items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" />
        <span>{data.text}</span>
      </div>
    </div>
  );
}
