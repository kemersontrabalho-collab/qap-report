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
      <header className="sticky top-0 z-30 border-b border-[var(--surface-line)] glass supports-[backdrop-filter]:bg-[var(--surface-veil)]">
        {/*
         * HIERARQUIA VISUAL DO HEADER (3 zonas):
         *   [marca | navegação (≥md) | ações]
         * Em mobile a navegação some (vai para a bottom bar) e o grid vira
         * `1fr auto`: a marca é a única zona elástica e trunca; as ações são
         * shrink-0 e nunca são espremidas. Isso elimina o clipping que o
         * `flex justify-between` puro causava abaixo de 360px.
         */}
        <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-fluid py-2 sm:py-3 md:grid-cols-[auto_minmax(0,1fr)_auto]">
          <Link to="/dashboard" className="group flex min-w-0 items-center gap-2.5">
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--gradient-brand)] p-[1px] shadow-[var(--shadow-sm)] transition-transform duration-300 group-hover:scale-[1.04]">
              <span className="grid h-full w-full place-items-center rounded-[0.65rem] bg-card">
                <img
                  src={logoAsset.url}
                  alt="QAP Report"
                  width={28}
                  height={28}
                  decoding="async"
                  loading="eager"
                  // aspect-square + object-contain reserva a caixa antes do
                  // download da imagem → zero CLS.
                  className="aspect-square h-7 w-7 object-contain"
                />
              </span>
            </span>
            <span className="truncate text-[0.95rem] font-semibold tracking-tight">
              QAP <span className="text-gradient-brand">Report</span>
            </span>
          </Link>

          <nav className="hidden items-center justify-center gap-1 rounded-full border border-[var(--surface-line)] bg-muted/40 p-1 md:flex">
            {navItems.map((item) => {
              const active = pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  data-tour={`nav-${item.to.slice(1)}`}
                  className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-all duration-300 [transition-timing-function:var(--ease-out-expo)] ${
                    active
                      ? "bg-card text-foreground shadow-[var(--shadow-sm)] ring-1 ring-[var(--surface-line)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <item.icon
                    className={`h-4 w-4 shrink-0 ${active ? "text-primary" : ""}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              to="/bulletins/new"
              data-tour="new-bulletin"
              className="btn-brand inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3.5 text-sm font-medium sm:min-h-9 sm:py-1.5"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Novo</span>
            </Link>

            <div data-tour="notifications">
              <NotificationBell />
            </div>

            <button
              onClick={toggle}
              className="btn-ghost-line grid h-11 w-11 place-items-center rounded-xl sm:h-9 sm:w-9"
              aria-label="Alternar tema"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {/* Sair fica no header apenas no desktop; em mobile vive na bottom bar. */}
            <button
              onClick={signOut}
              className="btn-ghost-line hidden h-9 w-9 place-items-center rounded-xl sm:grid"
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
        className="glass fixed inset-x-0 bottom-0 z-30 border-x-0 border-b-0 border-t pb-safe md:hidden"
      >
        <div className="grid grid-cols-4">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour-mobile={`nav-${item.to.slice(1)}`}
                className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 px-1 py-2 text-[0.6875rem] leading-tight transition-colors duration-300 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-[var(--gradient-brand)]" />
                )}
                <item.icon
                  className={`h-5 w-5 shrink-0 transition-transform duration-300 ${active ? "scale-110" : ""}`}
                />
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
