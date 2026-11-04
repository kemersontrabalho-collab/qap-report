import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

type Step = {
  title: string;
  body: string;
  /** Rota fixa, ou "editor" para abrir um boletim real no editor. */
  route?: string;
  /** CSS selector, tries in order. Falls back to centered card. */
  target?: string;
  /** Destaca o bloco que contém este texto (label/título/botão). */
  text?: string;
  /** Sobe até o ancestral que casa com este seletor antes de destacar. */
  closest?: string;
};

const EDITOR = "editor";

const STEPS: Step[] = [
  {
    title: "Bem-vindo ao QAP Report",
    body: "Vamos passear pelas telas reais do app: Painel, editor de boletim, Dúvidas com IA e Configurações. Use Próximo ou as setas do teclado.",
    route: "/dashboard",
  },
  {
    title: "Escolha o tipo de boletim",
    body: "Toque em BA, BO-COP ou BO-TC para criar um boletim já com o modelo certo. O botão 'Novo' no topo faz o mesmo.",
    route: "/dashboard",
    target: '[data-tour="bulletin-types"]',
  },
  {
    title: "Busca inteligente",
    body: "Encontre boletins por título, trecho do texto, categoria ou data. Acentos e maiúsculas não importam.",
    route: "/dashboard",
    target: '[data-tour="dashboard-search"]',
  },
  {
    title: "Rascunhos, Concluídos, Favoritos e Lixeira",
    body: "Este menu troca entre as abas dos seus boletins. Itens da Lixeira são apagados de vez depois de um tempo.",
    route: "/dashboard",
    target: '[data-tour="tabs-menu"]',
  },
  {
    title: "Notificações",
    body: "O sino mostra avisos e novidades do app em tempo real.",
    route: "/dashboard",
    target: '[data-tour="notifications"]',
  },
  {
    title: "Dentro do boletim",
    body: "Agora estamos no editor. Vamos ver cada caixa que você preenche antes de gerar o histórico.",
    route: EDITOR,
  },
  {
    title: "Título e Categoria",
    body: "Dê um título curto e busque a infração pelo nome na Categoria. Toque na opção para inseri-la.",
    route: EDITOR,
    text: "Título do Boletim",
    closest: ".surface-card",
  },
  {
    title: "Dados operacionais",
    body: "Composição da Guarnição, Prefixo da viatura (deixe vazio se estavam a pé) e Data e Hora, que já vem com o horário do aparelho.",
    route: EDITOR,
    text: "Dados operacionais",
    closest: ".surface-card",
  },
  {
    title: "Apoio da Guarnição",
    body: "Preencha só se houve apoio. Em branco, nenhum apoio é citado no texto.",
    route: EDITOR,
    text: "Apoio da Guarnição",
    closest: "div",
  },
  {
    title: "Localizações",
    body: "Localização da Guarnição e da Ocorrência: digite ou use o botão de GPS. Confira o endereço antes de gerar.",
    route: EDITOR,
    text: "Localização da Ocorrência",
    closest: "div",
  },
  {
    title: "Materiais apreendidos",
    body: "Liste armas, drogas, dinheiro ou celulares. Eles entram no texto e num quadro no PDF.",
    route: EDITOR,
    text: "Materiais apreendidos",
    closest: ".surface-card, section, div",
  },
  {
    title: "Envolvidos",
    body: "Cadastre autor, vítima e testemunhas. A câmera lê o documento e preenche os dados; a foto não é guardada.",
    route: EDITOR,
    text: "Envolvidos",
    closest: ".surface-card, section, div",
  },
  {
    title: "Texto corrido: o histórico",
    body: "Aqui você conta o que aconteceu do seu jeito, como um relato contínuo. Toque no microfone para ditar em vez de digitar. A IA só redige o que você informou.",
    route: EDITOR,
    text: "Texto corrido",
    closest: ".surface-card",
  },
  {
    title: "Gerar texto",
    body: "Toque aqui para a IA escrever o histórico técnico. Depois você pode editar à vontade e gerar de novo.",
    route: EDITOR,
    text: "Gerar texto|Regerar texto|Gerando",
    closest: "button",
  },
  {
    title: "Documento, auditoria e concluir",
    body: "O texto aparece aqui. Veja os alertas da Auditoria Jurídica, exporte em PDF, envie no WhatsApp e toque em Concluir. Tudo é salvo sozinho, até sem sinal.",
    route: EDITOR,
    text: "Documento",
    closest: "section",
  },
  {
    title: "Dúvidas com IA",
    body: "Pergunte sobre leis, penas ou procedimentos e receba a resposta na hora.",
    route: "/ai-chat",
    target: "form textarea",
    closest: "form",
  },
  {
    title: "Conversar por voz",
    body: "Toque em 'Conversar por voz' para falar a dúvida em voz alta e ouvir a resposta, sem digitar.",
    route: "/ai-chat",
    text: "Conversar por voz",
    closest: "button",
  },
  {
    title: "Assinatura",
    body: "Veja seu plano, assine via Pix ou resgate um cupom.",
    route: "/settings",
    text: "Assinatura",
    closest: "section",
  },
  {
    title: "Aparência",
    body: "Escolha o tema Claro, Escuro ou Tático noturno, ideal para o turno da noite.",
    route: "/settings",
    text: "Aparência",
    closest: "section",
  },
  {
    title: "Rever este tutorial",
    body: "Você pode reabrir este passeio quando quiser por aqui. Em Configurações também ficam seus modelos, a base coletiva, o suporte e a exclusão da conta.",
    route: "/settings",
    text: "Tutorial do aplicativo",
    closest: "section",
  },
  {
    title: "Tudo pronto!",
    body: "Crie seu primeiro boletim ou explore o app à vontade.",
    route: "/dashboard",
  },
];

/** Abre o boletim mais recente; se o usuário ainda não tem nenhum, cria um rascunho de exemplo. */
async function resolveEditorId(): Promise<string | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("bulletins")
    .select("id")
    .eq("user_id", u.user.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (data?.id) return data.id;
  const { data: created } = await supabase
    .from("bulletins")
    .insert({ user_id: u.user.id, bulletin_type: "BA", title: "Exemplo do tutorial" })
    .select("id")
    .single();
  return created?.id ?? null;
}

function findTarget(step: Step): HTMLElement | null {
  let el: HTMLElement | null = null;
  if (step.target) el = pickVisible(step.target);
  if (!el && step.text) {
    const wanted = step.text.split("|").map((t) => t.toLowerCase());
    const nodes = Array.from(
      document.querySelectorAll("main label, main h2, main h3, main button, main summary, main span, main div"),
    ) as HTMLElement[];
    el =
      nodes.find((n) => {
        if (n.children.length > 3) return false;
        const t = (n.textContent ?? "").trim().toLowerCase();
        const r = n.getBoundingClientRect();
        return r.width > 0 && wanted.some((w) => t.startsWith(w));
      }) ?? null;
  }
  if (el && step.closest) {
    const parent = el.matches(step.closest) ? el : el.closest(step.closest);
    if (parent instanceof HTMLElement && parent.tagName !== "MAIN") el = parent;
  }
  return el;
}

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

function useElementRect(step: Step | undefined, deps: unknown[]) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    setRect(null);
    if (!step || (!step.target && !step.text)) return;
    let cancelled = false;
    let rafId = 0;
    let scrolled = false;
    let lastKey = "";
    const tick = () => {
      if (cancelled) return;
      const el = findTarget(step);
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

  const editorId = useRef<string | null>(null);
  const [routing, setRouting] = useState(false);

  useEffect(() => {
    if (!open || !step?.route) return;
    if (lastRoute.current === step.route) return;
    lastRoute.current = step.route;
    if (step.route === EDITOR) {
      let cancelled = false;
      setRouting(true);
      (async () => {
        if (!editorId.current) editorId.current = await resolveEditorId();
        if (cancelled) return;
        setRouting(false);
        if (editorId.current) {
          navigate({ to: "/bulletins/$id", params: { id: editorId.current } }).catch(() => {});
        }
      })().catch(() => setRouting(false));
      return () => {
        cancelled = true;
      };
    }
    navigate({ to: step.route }).catch(() => {});
  }, [open, step, navigate]);

  useEffect(() => {
    if (!open) lastRoute.current = undefined;
  }, [open]);

  const rect = useElementRect(open && !routing ? step : undefined, [open, i, routing]);

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
              outline: "2px solid var(--primary)",
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
            {routing ? (
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            )}
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
