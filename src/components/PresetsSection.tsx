import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { translateDbError } from "@/lib/i18n-errors";

export type Preset = {
  id: string;
  name: string;
  bulletin_type: string;
  category: string | null;
  crew_composition: string | null;
  vehicle_prefix: string | null;
  support_crew: string | null;
  keywords: string | null;
  context: string | null;
};

export async function loadPresets(): Promise<Preset[]> {
  const { data, error } = await supabase
    .from("bulletin_presets")
    .select("id,name,bulletin_type,category,crew_composition,vehicle_prefix,support_crew,keywords,context")
    .order("updated_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

export function PresetsSection() {
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const reload = () =>
    loadPresets()
      .then(setPresets)
      .catch(() => setPresets([]));
  useEffect(() => {
    void reload();
  }, []);

  async function rename(p: Preset) {
    const name = prompt("Novo nome do modelo", p.name);
    if (!name?.trim()) return;
    const { error } = await supabase.from("bulletin_presets").update({ name: name.trim().slice(0, 120) }).eq("id", p.id);
    if (error) toast.error(translateDbError(error));
    else void reload();
  }
  async function remove(p: Preset) {
    if (!confirm(`Excluir o modelo "${p.name}"?`)) return;
    const { error } = await supabase.from("bulletin_presets").delete().eq("id", p.id);
    if (error) toast.error(translateDbError(error));
    else void reload();
  }

  return (
    <section className="surface-card reveal rounded-2xl p-5">
      <h2 className="font-semibold">Meus modelos</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Crie no editor com “Salvar como modelo” e use em Novo boletim.
      </p>
      {presets === null ? null : presets.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhum modelo salvo ainda.</p>
      ) : (
        <ul className="mt-3 divide-y rounded-lg border">
          {presets.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 text-xs font-semibold text-primary">{p.bulletin_type}</span>
                {p.name}
              </span>
              <span className="flex shrink-0 gap-1">
                <button onClick={() => rename(p)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent" aria-label="Renomear modelo">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => remove(p)} className="grid h-8 w-8 place-items-center rounded-md text-destructive hover:bg-destructive/10" aria-label="Excluir modelo">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
