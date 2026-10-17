import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

type Step = {
  title: string;
  body: string;
  route?: string;
  /** CSS selector, tries in order. Falls back to centered card. */
  target?: string;
};

const STEPS: Step[] = [
  {
    title: "Bem-vindo ao QAP Report",
    body: "Vamos fazer um tour rápido pelas telas reais do app. A cada passo destacamos o que importa.",
    route: "/dashboard",
  },
  {
    title: "Seu período de teste (24h)",
    body: "Toda nova conta ganha 24h grátis para usar tudo. Um aviso no topo do painel mostra quanto tempo resta. Depois, o acesso fica limitado até você assinar um plano ou resgatar um cupom em Configurações.",
    route: "/dashboard",
  },
  {
    title: "Escolha o tipo de boletim",
    body: "No painel, clique em BA, BO-COP ou BO-TC para criar um novo boletim já com o modelo certo. O botão 'Novo' no topo também abre o mesmo fluxo.",
    route: "/dashboard",
    target: '[data-tour="bulletin-types"]',
  },
  {
    title: "Busca inteligente",
    body: "Encontre boletins por título, trecho de texto, categoria ou data — a busca ignora acentos e maiúsculas.",
    route: "/dashboard",
    target: '[data-tour="dashboard-search"]',
  },
  {
    title: "Abas organizadas",
    body: "As três linhas no canto superior direito abrem o menu de abas: Rascunhos, Concluídos, Favoritos e Lixeira. Ao favoritar um boletim, ele sai dos Rascunhos e vai direto para Favoritos.",
    route: "/dashboard",
    target: '[data-tour="tabs-menu"]',
  },
  {
    title: "Editor: dados da ocorrência",
    body: "Ao abrir um BA, BO-COP ou BO-TC você preenche: Título, Categoria (busque a infração pelo nome), Composição da Guarnição, Prefixo da viatura (deixe vazio se a guarnição estava a pé), Apoio da Guarnição (só se houve apoio) e Data e Hora — já vem com o horário do seu aparelho e pode ser ajustada.",
    route: "/dashboard",
  },
  {
    title: "Editor: localizações",
    body: "Localização da Guarnição e Localização da Ocorrência podem ser digitadas ou preenchidas pelo botão de GPS. Confira sempre o endereço antes de gerar.",
    route: "/dashboard",
  },
  {
    title: "Editor: palavras-chave e contexto",
    body: "Na caixa de palavras-chave escreva o que aconteceu do seu jeito — frases soltas ou um relato corrido, sem precisar de vírgulas. No contexto, acrescente detalhes (versões dos envolvidos, fundada suspeita, uso de algemas). Use o microfone para ditar. A IA só redige o que você informou, sem inventar.",
    route: "/dashboard",
  },
  {
    title: "Editor: apreensões e envolvidos",
    body: "Adicione materiais apreendidos (arma, droga, dinheiro, celular) e os envolvidos. A câmera lê o documento e preenche os dados; a foto não é guardada. Confira tudo antes de confirmar.",
    route: "/dashboard",
  },
  {
    title: "Editor: gerar, auditar e concluir",
    body: "Toque em Gerar para criar o histórico técnico. Revise e edite o texto, veja os alertas da Auditoria Jurídica e use 'Corrigir com IA' se quiser. Depois exporte em PDF, copie para o WhatsApp, salve como modelo e toque em Concluir. O app salva sozinho enquanto você digita, mesmo sem sinal.",
    route: "/dashboard",
  },
  {
    title: "Notificações",
    body: "O sino mostra avisos e atualizações do app em tempo real. Você pode limpar, ocultar e reativar quando quiser.",
    route: "/dashboard",
    target: '[data-tour="notifications"]',
  },
  {
    title: "Dúvidas com IA",
    body: "Precisa consultar uma lei, pena ou o documento correto para uma situação? Digite a pergunta na aba 'Dúvidas IA' e receba uma resposta rápida. Sempre confira o texto legal oficial em casos importantes.",
    route: "/ai-chat",
    target: '[data-tour="nav-ai-chat"], [data-tour-mobile="nav-ai-chat"]',
  },
  {
    title: "Configurações e assinatura",
    body: "Em Configurações você edita seu perfil, escolhe o tema (Claro, Escuro ou Tático noturno), gerencia seus modelos salvos, envia boletins antigos à base coletiva, assina o plano ou resgata cupom, fala com o suporte, reabre este tutorial e pode excluir a conta com segurança.",
    route: "/settings",
    target: '[data-tour="nav-settings"], [data-tour-mobile="nav-settings"]',
  },
  {
    title: "Instale como app",
    body: "Instale o QAP Report na tela inicial para acesso rápido em tela cheia, funcionando como um app nativo em Android, iOS e navegador.",
    route: "/settings",
  },
  {
    title: "Tudo pronto!",
    body: "Você já pode começar. Crie seu primeiro boletim ou explore o app à vontade — o tutorial pode ser reaberto a qualquer momento em Configurações.",
    route: "/dashboard",
  },
];

const PADDING = 8;
const MARGIN = 12;

function getCardWidth() {
  if (typeof window === "undefined") return 320;
  return Math.min(340, window.innerWidth - MARGIN * 2);
}

function pickVisible(selector: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  for (const el of nodes) {
    const r = el.getBoundingClientRect();
    // Skip elements hidden via display:none / zero-size (e.g. desktop nav on mobile)
    if (r.width > 0 && r.height > 0 && el.offsetParent !== null) return el;
  }
  return nodes[0] ?? null;
}

function useElementRect(selector: string | undefined, deps: unknown[]) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    setRect(null);
    if (!selector) return;
    let cancelled = false;
    let rafId = 0;
    let scrolled = false;
    let lastKey = "";
    const tick = () => {
      if (cancelled) return;
      const el = pickVisible(selector);
      if (el) {
        if (!scrolled) {
          scrolled = true;
          try {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          } catch {
            /* ignore */
          }
        }
        const r = el.getBoundingClientRect();
        const key = `${r.x}|${r.y}|${r.width}|${r.height}`;
        if (key !== lastKey) {
          lastKey = key;
          setRect(r);
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return rect;
}

export function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const lastRoute = useRef<string | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<{ w: number; h: number }>({ w: getCardWidth(), h: 220 });
  const [vp, setVp] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 360,
    h: typeof window !== "undefined" ? window.innerHeight : 640,
  }));

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Navegação por teclado: setas avançam/voltam, Esc encerra o tour.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        setI((v) => Math.min(STEPS.length - 1, v + 1));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setI((v) => Math.max(0, v - 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      setCardSize((s) => ({ ...s, w: getCardWidth() }));
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  const step = STEPS[i];

  useEffect(() => {
    if (!open || !step?.route) return;
    if (lastRoute.current !== step.route) {
      lastRoute.current = step.route;
      navigate({ to: step.route }).catch(() => {});
    }
  }, [open, step, navigate]);

  const rect = useElementRect(open ? step?.target : undefined, [
    open,
    i,
    step?.target,
    step?.route,
  ]);

  // Measure real card size after render to position accurately on any screen
  useLayoutEffect(() => {
    if (!open) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (Math.abs(r.width - cardSize.w) > 1 || Math.abs(r.height - cardSize.h) > 1) {
      setCardSize({ w: r.width, h: r.height });
    }
  }, [open, i, rect, vp.w, vp.h, cardSize.h, cardSize.w]);

  if (!open || !step) return null;
  const last = i === STEPS.length - 1;
  const isMobile = vp.w < 480;

  // Compute spotlight box
  const spot = rect
    ? {
        top: Math.max(rect.top - PADDING, 4),
        left: Math.max(rect.left - PADDING, 4),
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // Card position: on mobile, dock to bottom / top away from spot; on desktop, near target
  let cardStyle: React.CSSProperties = {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };
  const CARD_W = cardSize.w;
  const CARD_H = cardSize.h;

  if (isMobile) {
    // Bottom sheet by default, unless spotlight is in bottom half → dock to top
    const dockTop = spot && spot.top + spot.height / 2 > vp.h / 2;
    const top = dockTop ? MARGIN : vp.h - CARD_H - MARGIN;
    const left = Math.max(MARGIN, (vp.w - CARD_W) / 2);
    cardStyle = { top, left, transform: "none" };
  } else if (spot) {
    const below = spot.top + spot.height + 12;
    const above = spot.top - CARD_H - 12;
    const useBelow = below + CARD_H < vp.h - 12 || above < 12;
    const top = useBelow ? below : Math.max(above, 12);
    const left = Math.min(
      Math.max(spot.left + spot.width / 2 - CARD_W / 2, 12),
      vp.w - CARD_W - 12,
    );
    cardStyle = { top, left, transform: "none" };
  }

  return (
    <div className="fixed inset-0 z-[100]" aria-modal role="dialog">
      {/* Transparent click-catcher for closing */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      {spot ? (
        <>
          <div
            className="pointer-events-none absolute rounded-xl transition-all duration-500 ease-out"
            style={{
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
              outline: "2px solid hsl(var(--primary))",
              outlineOffset: 2,
            }}
          />
          {/* Anel pulsante: guia o olhar para o elemento destacado */}
          <div
            className="pointer-events-none absolute animate-ping rounded-xl border-2 border-primary/60 transition-all duration-500 ease-out"
            style={{
              top: spot.top,
              left: spot.left,
              width: spot.width,
              height: spot.height,
              animationDuration: "2s",
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/65 transition-opacity duration-300" />
      )}

      {/* Floating card */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute rounded-2xl border bg-card p-4 shadow-2xl transition-all duration-300 ease-out sm:p-5"
        style={{
          ...cardStyle,
          width: CARD_W,
          maxHeight: `calc(100dvh - ${MARGIN * 2}px)`,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            <span className="truncate">
              Passo {i + 1} de {STEPS.length}
            </span>
          </span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-accent"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* key={i} força o remount → cada passo entra com animação */}
        <div key={i} className="animate-fade-in">
          <h3 className="mt-2 text-base font-semibold sm:text-lg">{step.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground sm:text-sm">
            {step.body}
          </p>
        </div>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-accent">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        {/* Navegação direta por etapa */}
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {STEPS.map((s, idx) => (
            <button
              key={s.title}
              onClick={() => setI(idx)}
              aria-label={`Ir para o passo ${idx + 1}: ${s.title}`}
              aria-current={idx === i}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === i
                  ? "w-6 bg-primary"
                  : idx < i
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border px-2.5 py-2 text-xs hover:bg-accent disabled:opacity-40 sm:px-3 sm:text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Anterior</span>
          </button>
          <button
            onClick={onClose}
            className="shrink-0 text-xs text-muted-foreground hover:underline"
          >
            Pular
          </button>
          {last ? (
            <button
              onClick={onClose}
              className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 sm:px-4 sm:text-sm"
            >
              Concluir
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 sm:px-3 sm:text-sm"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
