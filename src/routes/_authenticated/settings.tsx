import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { Loader2, Moon, Sun, LogOut, Trash2, Smartphone, Apple, Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações · RedaPol" }] }),
  component: SettingsPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  rank: string | null;
  phone: string | null;
  email: string | null;
  functional_id: string | null;
  avatar_url: string | null;
};

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single();
      setProfile(
        (data as Profile) ?? {
          id: userData.user.id,
          full_name: "",
          rank: "",
          phone: "",
          email: userData.user.email ?? "",
          functional_id: "",
          avatar_url: null,
        },
      );
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: profile.id,
        full_name: profile.full_name,
        rank: profile.rank,
        phone: profile.phone,
        email: profile.email,
        functional_id: profile.functional_id,
        avatar_url: profile.avatar_url,
      });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Dados atualizados");
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function deleteAccount() {
    if (!confirm("Tem certeza que deseja excluir sua conta? Esta ação é irreversível.")) return;
    if (!confirm("Confirme novamente: todos os seus dados serão apagados.")) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    // remove bulletins first (RLS + cascade also handles auth removal on server-side manually)
    await supabase.from("bulletins").delete().eq("user_id", userData.user.id);
    await supabase.from("profiles").delete().eq("id", userData.user.id);
    await supabase.auth.signOut();
    toast.success("Conta e dados removidos.");
    navigate({ to: "/", replace: true });
  }

  if (loading || !profile) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando...
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalize sua experiência e seus dados de perfil.
          </p>
        </div>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Aparência</h2>
          <p className="mt-1 text-sm text-muted-foreground">Alterne entre tema claro e escuro.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                theme === "light" ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <Sun className="h-4 w-4" /> Claro
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                theme === "dark" ? "border-primary bg-primary/5" : "hover:bg-accent"
              }`}
            >
              <Moon className="h-4 w-4" /> Escuro
            </button>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Dados pessoais</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nome completo">
              <input
                value={profile.full_name ?? ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Graduação">
              <input
                value={profile.rank ?? ""}
                onChange={(e) => setProfile({ ...profile, rank: e.target.value })}
                className="input"
                placeholder="Ex.: Soldado, Cabo, Sargento"
              />
            </Field>
            <Field label="Celular">
              <input
                value={profile.phone ?? ""}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Email">
              <input
                value={profile.email ?? ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="input"
                type="email"
              />
            </Field>
            <Field label="Identidade funcional (opcional)">
              <input
                value={profile.functional_id ?? ""}
                onChange={(e) => setProfile({ ...profile, functional_id: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar alterações
          </button>
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="font-semibold">Sessão</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-accent"
            >
              <LogOut className="h-4 w-4" /> Sair da conta
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
          <h2 className="font-semibold text-destructive">Excluir conta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Remove seu perfil e todos os seus boletins. Esta ação não pode ser desfeita.
          </p>
          <button
            onClick={deleteAccount}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90"
          >
            <Trash2 className="h-4 w-4" /> Excluir minha conta
          </button>
        </section>

        <style>{`.input{margin-top:.25rem;width:100%;border-radius:.5rem;border:1px solid var(--color-border);background:var(--color-background);padding:.5rem .75rem;font-size:.875rem;outline:none}
        .input:focus{box-shadow:0 0 0 2px var(--color-ring)}`}</style>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
