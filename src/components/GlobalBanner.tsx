import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Banner = { text: string; level: "info" | "warning" | "critical"; active: boolean };

function isBanner(value: unknown): value is Banner {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const banner = value as Record<string, unknown>;
  return (
    typeof banner.text === "string" &&
    typeof banner.active === "boolean" &&
    (banner.level === "info" || banner.level === "warning" || banner.level === "critical")
  );
}

/** Aviso global definido pelo administrador (aba Monitoramento → Autocura). */
export function GlobalBanner() {
  const { data } = useQuery({
    queryKey: ["global-banner"],
    queryFn: async (): Promise<Banner | null> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "global_banner")
        .maybeSingle();
      if (error) throw error;
      if (!data?.value) return null;
      try {
        const parsed: unknown = JSON.parse(data.value);
        return isBanner(parsed) ? parsed : null;
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
