import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Settings, LogOut, Moon, Sun, Plus, MessageCircle } from "lucide-react";
import logoAsset from "@/assets/qap-report-logo.webp.asset.json";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";
import { usePresence } from "@/lib/usePresence";

import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { NotificationBell } from "@/components/NotificationBell";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  usePresence();


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
      toast.error(
        e instanceof Error ? e.message : "Não foi possível encerrar a sessão. Tente novamente.",
      );
    }
  }

  const navItems = [
    { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
    { to: "/ai-chat", label: "Dúvidas IA", icon: MessageCircle },
    { to: "/settings", label: "Configurações", icon: Settings },
  ] as const;

  return (
    // min-h-dvh (e não h-screen): no mobile, 100vh ignora a barra de endereço
    // retrátil e gera um "pulo" de layout ao rolar. dvh acompanha o viewport real.
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        {/*
         * HIERARQUIA VISUAL DO HEADER (3 zonas):
         *   [marca | navegação (≥md) | ações]
         * Em mobile a navegação some (vai para a bottom bar) e o grid vira
         * `1fr auto`: a marca é a única zona elástica e trunca; as ações são
         * shrink-0 e nunca são espremidas. Isso elimina o clipping que o
         * `flex justify-between` puro causava abaixo de 360px.
         */}
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-fluid py-2 sm:py-3 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <img
              src={logoAsset.url}
              alt="QAP Report"
              width={32}
              height={32}
              decoding="async"
              loading="eager"
              // aspect-square + object-contain reserva a caixa antes do
              // download da imagem → zero CLS.
              className="aspect-square h-8 w-8 shrink-0 object-contain"
            />
            <span className="truncate font-semibold tracking-tight">QAP Report</span>
          </Link>

          <nav className="hidden items-center justify-center gap-1 md:flex">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-tour={`nav-${item.to.slice(1)}`}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/bulletins/new"
              data-tour="new-bulletin"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 sm:min-h-9 sm:py-1.5"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Novo</span>
            </Link>
            <div data-tour="notifications">
              <NotificationBell />
            </div>

            <button
              onClick={toggle}
              className="grid h-11 w-11 place-items-center rounded-lg border hover:bg-accent sm:h-9 sm:w-9"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {/* Sair fica no header apenas no desktop; em mobile vive na bottom bar. */}
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

      {/* Um único landmark <main> por página. max-w-6xl trava a medida de
       * leitura em ultrawide; px-fluid escala o gutter e respeita o notch. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-fluid py-6 sm:py-8">{children}</main>

      {/* BOTTOM BAR (mobile): 4 colunas iguais, cada célula com ≥44px de altura
       * e rótulo truncado. pb-safe evita que a home indicator do iOS cubra os
       * alvos de toque. */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-safe backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour-mobile={`nav-${item.to.slice(1)}`}
                className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] leading-tight ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={signOut}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] leading-tight text-muted-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="w-full truncate text-center">Sair</span>
          </button>
        </div>
      </nav>
      {/* Espaçador: altura da barra + área segura, para o último item da lista
       * nunca ficar escondido atrás dela. */}
      <div className="h-14 pb-safe md:hidden" />
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
