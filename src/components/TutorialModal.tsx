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
    body: "No painel, clique em BA, BO-COP, BO-TC ou BOAT para criar um novo boletim já com o modelo certo. O botão 'Novo' no topo também abre o mesmo fluxo.",
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
    title: "Editor padronizado",
    body: "Cada boletim tem campos fixos: Título, Categoria (com busca da infração), Composição da Guarnição, Localização da Guarnição, Localização da Ocorrência (via GPS/Google Maps) e Data/Hora automática. Ditado por voz e exportação em PDF estão prontos para uso.",
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
    body: "Precisa consultar uma lei, pena ou o documento correto para uma situação? A aba 'Dúvidas IA' é seu apoio jurídico rápido.",
    route: "/ai-chat",
    target: '[data-tour="nav-ai-chat"], [data-tour-mobile="nav-ai-chat"]',
  },
  {
    title: "Configurações e assinatura",
    body: "Em Configurações você assina planos, resgata cupons, envia suporte ao administrador, ativa notificações do dispositivo, reabre este tutorial e pode excluir a conta com segurança.",
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

  const rect = useElementRect(open ? step?.target : undefined, [open, i, step?.target, step?.route]);

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
    const left = Math.min(Math.max(spot.left + spot.width / 2 - CARD_W / 2, 12), vp.w - CARD_W - 12);
    cardStyle = { top, left, transform: "none" };
  }

  return (
    <div className="fixed inset-0 z-[100]" aria-modal role="dialog">
      {/* Transparent click-catcher for closing */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-xl"
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
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-black/65" />
      )}




      {/* Floating card */}
      <div
        ref={cardRef}
        className="pointer-events-auto absolute animate-fade-in rounded-2xl border bg-card p-4 shadow-2xl sm:p-5"
        style={{ ...cardStyle, width: CARD_W, maxHeight: `calc(100dvh - ${MARGIN * 2}px)`, overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Passo {i + 1} de {STEPS.length}</span>
          </span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"
            aria-label="Fechar tour"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-accent">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${((i + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </button>
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:underline"
          >
            Pular
          </button>
          {last ? (
            <button
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Concluir
            </button>
          ) : (
            <button
              onClick={() => setI((v) => Math.min(STEPS.length - 1, v + 1))}
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Próximo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
