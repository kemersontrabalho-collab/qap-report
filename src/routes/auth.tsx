import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { translateAuthError } from "@/lib/i18n-errors";
import { setSessionLifetime } from "@/lib/session-lifetime";
import logoAsset from "@/assets/qap-report-logo.png.asset.json";

const search = z.object({
  mode: z.enum(["login", "signup"]).optional(),
  redirect: z.string().optional(),
});


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
  const { mode: initialMode, redirect: redirectTo } = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(initialMode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Aceita somente caminhos internos (mesma origem) — evita open redirect.
  function safeRedirect(): string {
    if (!redirectTo) return "/dashboard";
    if (redirectTo.startsWith("/") && !redirectTo.startsWith("//")) return redirectTo;
    return "/dashboard";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setSessionLifetime(keepSignedIn);
        toast.success("Bem-vindo(a) de volta!");
        navigate({ to: safeRedirect(), replace: true });
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${safeRedirect()}`,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar o cadastro e então entre.");
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
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      setSessionLifetime(keepSignedIn);
      toast.success("Bem-vindo(a)!");
      navigate({ to: safeRedirect(), replace: true });
    } catch (err) {
      toast.error(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("apple", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      setSessionLifetime(keepSignedIn);
      toast.success("Bem-vindo(a)!");
      navigate({ to: safeRedirect(), replace: true });
    } catch (err) {
      toast.error(translateAuthError(err));
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
                    minLength={mode === "signup" ? 8 : 6}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "Sua senha"}
                  />
                  {mode === "signup" && <PasswordRequirements password={password} />}
                </div>
              )}
              {mode === "login" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={keepSignedIn}
                    onChange={(e) => setKeepSignedIn(e.target.checked)}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  Manter conectado por 8 horas
                </label>
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

            {mode !== "forgot" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" />
                  ou
                  <div className="h-px flex-1 bg-border" />
                </div>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={loading}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.5 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.8 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"/>
                  </svg>
                  Continuar com Google
                </button>
                <button
                  type="button"
                  onClick={handleApple}
                  disabled={loading}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border bg-black px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16.365 1.43c0 1.14-.42 2.22-1.24 3.02-.83.82-2.13 1.44-3.18 1.35-.14-1.09.44-2.22 1.2-2.97.85-.82 2.28-1.4 3.22-1.4zM20.5 17.36c-.55 1.28-.81 1.85-1.53 2.99-.99 1.57-2.39 3.53-4.13 3.55-1.54.02-1.94-1-4.03-.99-2.09.01-2.53 1.01-4.07.99-1.74-.02-3.06-1.79-4.05-3.36C0.09 16.51-.21 11.29 1.61 8.5c1.28-1.96 3.29-3.11 5.19-3.11 1.93 0 3.14 1.06 4.74 1.06 1.55 0 2.5-1.06 4.73-1.06 1.68 0 3.46.92 4.73 2.5-4.15 2.28-3.48 8.22.5 9.47z"/>
                  </svg>
                  Continuar com Apple
                </button>
              </>
            )}



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
