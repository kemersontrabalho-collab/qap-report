import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import logoAsset from "@/assets/qap-report-logo.png.asset.json";

const search = z.object({ mode: z.enum(["login", "signup"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Entrar · QAP Report" },
      { name: "description", content: "Acesse sua conta QAP Report." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo(a) de volta!");
        navigate({ to: "/dashboard" });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para seu email.");
        setMode("login");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ocorreu um erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="QAP Report" className="h-10 w-10 object-contain" />
            <span className="text-lg font-semibold">QAP Report</span>
          </Link>
          <div>
            <h2 className="text-3xl font-bold leading-tight">
              Redação policial assistida por IA.
            </h2>
            <p className="mt-3 text-sm opacity-80">
              Gere boletins BA, BO-COP, BO-TC e BOAT com terminologia técnica adequada
              e fidelidade aos fatos.
            </p>
          </div>
          <div className="text-xs opacity-70">© {new Date().getFullYear()} QAP Report</div>
        </div>

        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <div className="mb-8 md:hidden">
              <Link to="/" className="flex items-center gap-2 text-foreground">
                <img src={logoAsset.url} alt="QAP Report" className="h-6 w-6 object-contain" />
                <span className="font-semibold">QAP Report</span>
              </Link>
            </div>
            <h1 className="text-2xl font-bold">
              {mode === "login" && "Entrar"}
              {mode === "signup" && "Criar conta"}
              {mode === "forgot" && "Recuperar senha"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "login" && "Acesse sua conta para continuar."}
              {mode === "signup" && "Preencha seus dados para começar."}
              {mode === "forgot" && "Enviaremos um link para o seu email."}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="text-sm font-medium">Nome completo</label>
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Ex.: João da Silva"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Email</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="voce@email.com"
                />
              </div>
              {mode !== "forgot" && (
                <div>
                  <label className="text-sm font-medium">Senha</label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === "login" && "Entrar"}
                {mode === "signup" && "Criar conta"}
                {mode === "forgot" && "Enviar link"}
              </button>
            </form>

            <div className="mt-6 space-y-2 text-sm">
              {mode === "login" && (
                <>
                  <button
                    onClick={() => setMode("forgot")}
                    className="text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                  <div className="text-muted-foreground">
                    Não tem conta?{" "}
                    <button
                      onClick={() => setMode("signup")}
                      className="text-primary hover:underline"
                    >
                      Criar conta
                    </button>
                  </div>
                </>
              )}
              {mode === "signup" && (
                <div className="text-muted-foreground">
                  Já tem conta?{" "}
                  <button
                    onClick={() => setMode("login")}
                    className="text-primary hover:underline"
                  >
                    Entrar
                  </button>
                </div>
              )}
              {mode === "forgot" && (
                <button onClick={() => setMode("login")} className="text-primary hover:underline">
                  Voltar para entrar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
