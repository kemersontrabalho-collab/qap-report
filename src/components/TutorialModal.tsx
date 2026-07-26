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
    body: "Vamos fazer um tour rápido pelo app. A cada passo o tutorial vai te levar até a tela real e destacar o que importa.",
    route: "/dashboard",
  },
  {
    title: "Painel principal",
    body: "Esta é sua tela inicial. Todos os boletins ficam organizados por status: Rascunhos, Feitos, Favoritos e Lixeira.",
    route: "/dashboard",
    target: '[data-tour="nav-dashboard"], [data-tour-mobile="nav-dashboard"]',
  },
  {
    title: "Criar um novo boletim",
    body: "Toque no botão 'Novo' (canto superior direito) para iniciar um BA, BO-COP, BO-TC ou BOAT.",
    route: "/dashboard",
    target: '[data-tour="new-bulletin"]',
  },
  {
    title: "Escolha o tipo",
    body: "Cada tipo de boletim tem uma finalidade. Selecione o mais adequado à ocorrência para começar a redigir.",
    route: "/bulletins/new",
  },
  {
    title: "Notificações",
    body: "O sino mostra avisos e atualizações do app em tempo real. Você pode limpar, ocultar e reativar quando quiser.",
    route: "/dashboard",
    target: '[data-tour="notifications"]',
  },
  {
    title: "Dúvidas com IA",
    body: "Precisa consultar uma lei, pena ou o documento correto para uma situação? A aba 'Dúvidas IA' é seu apoio jurídico.",
    route: "/ai-chat",
    target: '[data-tour="nav-ai-chat"], [data-tour-mobile="nav-ai-chat"]',
  },
  {
    title: "Configurações",
    body: "Ative notificações do dispositivo, envie suporte ao administrador, verifique atualizações e compartilhe o link oficial do QAP Report.",
    route: "/settings",
    target: '[data-tour="nav-settings"], [data-tour-mobile="nav-settings"]',
  },
  {
    title: "Instalação",
    body: "Instale o QAP Report na tela inicial para acesso rápido como um app nativo, em tela cheia.",
    route: "/settings",
  },
  {
    title: "Tudo pronto!",
    body: "Você já pode começar. Crie seu primeiro boletim ou explore o app à vontade — o tutorial pode ser reaberto a qualquer momento em Configurações.",
    route: "/dashboard",
  },
];

const PADDING = 8;
const CARD_W = 320;
const CARD_H_APPROX = 220;

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

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  const step = STEPS[i];

  useEffect(() => {
    if (!open || !step?.route) return;
    if (lastRoute.current !== step.route) {
      lastRoute.current = step.route;
      navigate({ to: step.route }).catch(() => {});
    }
  }, [open, step, navigate]);

  const rect = useElementRect(open ? step?.target : undefined, [open, i, step?.target, step?.route]);

  if (!open || !step) return null;
  const last = i === STEPS.length - 1;

  // Compute spotlight box
  const spot = rect
    ? {
        top: Math.max(rect.top - PADDING, 4),
        left: Math.max(rect.left - PADDING, 4),
        width: rect.width + PADDING * 2,
        height: rect.height + PADDING * 2,
      }
    : null;

  // Card position: below the target if room, else above; else centered
  let cardStyle: React.CSSProperties = {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  };
  if (spot) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const below = spot.top + spot.height + 12;
    const above = spot.top - CARD_H_APPROX - 12;
    const useBelow = below + CARD_H_APPROX < vh - 12 || above < 12;
    const top = useBelow ? below : Math.max(above, 12);
    const left = Math.min(Math.max(spot.left + spot.width / 2 - CARD_W / 2, 12), vw - CARD_W - 12);
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
        className="pointer-events-auto absolute w-[320px] max-w-[calc(100vw-24px)] animate-fade-in rounded-2xl border bg-card p-5 shadow-2xl"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Passo {i + 1} de {STEPS.length}
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
