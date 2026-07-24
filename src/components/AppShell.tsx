import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { ShieldCheck, LayoutDashboard, Settings, LogOut, Moon, Sun, Plus, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth", replace: true });
  }

  const navItems = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { to: "/ai-chat", label: "Dúvidas IA", icon: MessageCircle },
    { to: "/settings", label: "Configurações", icon: Settings },
  ] as const;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">RedaPol</span>
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
        <div className="grid grid-cols-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center justify-center gap-1 py-2 text-xs ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
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
    categories: [
      "Abordagem com Condução",
      "Trânsito com Condução",
      "Violência Doméstica com Condução",
      "Tráfico de Drogas (flagrante)",
    ],
  },
  {
    code: "BO-COP",
    name: "Comunicação de Ocorrência Policial",
    desc: "Indivíduo presente no local (inclui consumo de maconha).",
    categories: [
      "Crimes Patrimoniais",
      "Crimes Graves & Flagrante",
      "Violência Doméstica (Local)",
      "Proteção a Vulneráveis",
      "Homicídio / Encontro de Cadáver",
      "Consumo de Maconha (indivíduo presente)",
    ],
  },
  {
    code: "BO-TC",
    name: "Termo Circunstanciado",
    desc: "Infrações de menor potencial ofensivo.",
    categories: ["Crimes de Menor Potencial Ofensivo", "Posse de Cocaína para Consumo Pessoal"],
  },
  {
    code: "BOAT",
    name: "Boletim de Acidente de Trânsito",
    desc: "Ocorrências específicas de trânsito.",
    categories: ["Acidente de Trânsito", "Infração de Trânsito"],
  },
] as const;

export type BulletinCode = (typeof BULLETIN_TYPES)[number]["code"];
