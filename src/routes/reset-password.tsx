import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { translateAuthError } from "@/lib/i18n-errors";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha · QAP Report" },
      {
        name: "description",
        content:
          "Portal seguro para recuperar o acesso à sua conta QAP Report e definir uma nova senha com validação em tempo real.",
      },
      { property: "og:title", content: "Nova senha · QAP Report" },
      {
        property: "og:description",
        content:
          "Portal seguro para recuperar o acesso à sua conta QAP Report e definir uma nova senha com validação em tempo real.",
      },
      { property: "og:url", content: "https://qap-report.lovable.app/reset-password" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://qap-report.lovable.app/reset-password" }],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  // Só permite atualizar a senha após confirmar que existe uma sessão de
  // recuperação. Sem isso, `updateUser` falha com "Auth session missing".
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Senha atualizada com sucesso.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-lg"
      >
        <h1 className="text-xl font-semibold">Definir nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {ready
            ? "Escolha uma senha nova para sua conta."
            : "Abra este link a partir do email de recuperação para continuar."}
        </p>
        <div className="mt-5">
          <label htmlFor="new-password" className="text-sm font-medium">
            Nova senha
          </label>
          <input
            id="new-password"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={6}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!ready}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>
        <div className="mt-3">
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirmar nova senha
          </label>
          <input
            id="confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            required
            minLength={6}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!ready}
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
        </div>
        <button
          disabled={loading || !ready}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Atualizar senha
        </button>
      </form>
    </div>
  );
}
