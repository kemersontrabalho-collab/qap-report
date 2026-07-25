import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Settings, LogOut, Moon, Sun, Plus, MessageCircle, Shield } from "lucide-react";
import logoAsset from "@/assets/qap-report-logo.png.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isFounder } from "@/lib/admin.functions";
import { NotificationBell } from "@/components/NotificationBell";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const founderFn = useServerFn(isFounder);
  const { data: sessionData } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await supabase.auth.getSession()).data.session,
    staleTime: 60_000,
  });
  const emailIsFounder =
    sessionData?.user?.email?.toLowerCase() === "kemersontrabalho@gmail.com";
  const { data: founderData } = useQuery({
    queryKey: ["is-founder"],
    queryFn: () => founderFn(),
    staleTime: 5 * 60_000,
    enabled: emailIsFounder,
  });
  const founder = emailIsFounder || founderData?.founder === true;

  async function signOut() {
    try {
      await qc.cancelQueries();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      qc.clear();
      toast.success("Sessão encerrada");
      navigate({ to: "/auth", replace: true });
    } catch (e) {
      // Não limpar o cache se o signOut falhou — o usuário ainda tem sessão.
      toast.error(e instanceof Error ? e.message : "Não foi possível encerrar a sessão. Tente novamente.");
    }
  }


  const baseNav = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { to: "/ai-chat", label: "Dúvidas IA", icon: MessageCircle },
    { to: "/settings", label: "Configurações", icon: Settings },
  ] as const;
  const navItems = founder
    ? ([...baseNav.slice(0, 2), { to: "/admin", label: "Criador", icon: Shield }, baseNav[2]] as const)
    : baseNav;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="QAP Report" className="h-8 w-8 object-contain" />
            <span className="font-semibold tracking-tight">QAP Report</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/bulletins/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo</span>
            </Link>
            <NotificationBell />
            <button
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-accent"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={signOut}
              className="hidden h-9 w-9 place-items-center rounded-lg border hover:bg-accent sm:grid"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur md:hidden">
        <div className={`grid ${navItems.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px] leading-tight ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="h-16 md:hidden" />
    </div>
  );
}

export const BULLETIN_TYPES = [
  {
    code: "BA",
    name: "Boletim de Atendimento",
    desc: "Condução à delegacia (inclui tráfico em flagrante).",
  },
  {
    code: "BO-COP",
    name: "Comunicação de Ocorrência Policial",
    desc: "Indivíduo presente no local (inclui consumo de maconha).",
  },
  {
    code: "BO-TC",
    name: "Termo Circunstanciado",
    desc: "Infrações de menor potencial ofensivo.",
  },
  {
    code: "BOAT",
    name: "Boletim de Acidente de Trânsito",
    desc: "Ocorrências específicas de trânsito.",
  },
] as const;

export type BulletinCode = (typeof BULLETIN_TYPES)[number]["code"];
