import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { loadPresets, type Preset } from "@/components/PresetsSection";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, BULLETIN_TYPES } from "@/components/AppShell";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/bulletins/new")({
  head: () => ({ meta: [{ title: "Novo boletim · QAP Report" }] }),
  component: NewBulletin,
});

function NewBulletin() {
  const navigate = useNavigate();
  const [type, setType] = useState<string>("BA");
  const [loading, setLoading] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetId, setPresetId] = useState<string>("");
  useEffect(() => {
    loadPresets().then(setPresets).catch(() => {});
  }, []);
  const preset = presets.find((p) => p.id === presetId);

  async function create() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Sem sessão");
      const { data, error } = await supabase
        .from("bulletins")
        .insert({
          user_id: userData.user.id,
          bulletin_type: preset?.bulletin_type ?? type,
          title: preset ? preset.name : `Novo ${type}`,
          ...(preset
            ? {
                category: preset.category,
                crew_composition: preset.crew_composition,
                vehicle_prefix: preset.vehicle_prefix,
                support_crew: preset.support_crew,
                keywords: preset.keywords,
                context: preset.context,
              }
            : {}),
        })
        .select()
        .single();
      if (error) throw error;
      navigate({ to: "/bulletins/$id", params: { id: data.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold">Novo boletim</h1>
        <p className="mt-1 text-sm text-muted-foreground">Escolha o tipo de boletim.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {BULLETIN_TYPES.map((t) => (
            <button
              key={t.code}
              onClick={() => setType(t.code)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                type === t.code
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "hover:border-primary/40"
              }`}
            >
              <div className="text-xs font-semibold text-primary">{t.code}</div>
              <div className="mt-1 font-semibold">{t.name}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
        {presets.length > 0 && (
          <div className="mt-6">
            <label className="text-sm font-medium" htmlFor="preset">
              Começar de um modelo salvo (opcional)
            </label>
            <select
              id="preset"
              value={presetId}
              onChange={(e) => {
                setPresetId(e.target.value);
                const p = presets.find((x) => x.id === e.target.value);
                if (p) setType(p.bulletin_type);
              }}
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <option value="">Em branco</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.bulletin_type} — {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={create}
          disabled={loading}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Criar e continuar
        </button>
      </div>
    </AppShell>
  );
}
