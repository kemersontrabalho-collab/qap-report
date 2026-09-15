import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { askAI } from "@/lib/bulletins.functions";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle, Trash2 } from "lucide-react";

const MarkdownRenderer = lazy(() => import("@/components/MarkdownRenderer"));

export const Route = createFileRoute("/_authenticated/ai-chat")({
  head: () => ({
    meta: [
      { title: "Dúvidas com IA · QAP Report" },
      {
        name: "description",
        content:
          "Tire dúvidas jurídico-policiais: enquadramento legal, penas e qual documento usar.",
      },
      { property: "og:title", content: "Dúvidas com IA · QAP Report" },
      {
        property: "og:description",
        content:
          "Área privada para tirar dúvidas jurídico-policiais com apoio de IA no QAP Report.",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AIChatPage,
});

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Qual documento devo lavrar em caso de posse de maconha para consumo pessoal?",
  "Qual a pena para furto qualificado?",
  "Diferença entre BO-COP e BO-TC?",
  "O que exige a Súmula Vinculante 11 do STF?",
];

function AIChatPage() {
  const ask = useServerFn(askAI);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const MAX_MESSAGES = 20;

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (trimmed.length > 4000) {
      toast.error("Mensagem muito longa. Reduza para até 4000 caracteres.");
      return;
    }
    if (messages.length >= MAX_MESSAGES) {
      toast.error(
        `Limite de ${MAX_MESSAGES} mensagens por sessão atingido. Limpe o chat para continuar.`,
      );
      return;
    }
    const next: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.content }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro na IA");
      // Restaura o texto no input para o usuário poder tentar novamente sem reescrever.
      setMessages(messages);
      setInput(trimmed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="mx-auto flex max-w-3xl flex-col">
        <div className="aurora relative mb-6">
          <div className="reveal flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--surface-line)] bg-card/60 px-3 py-1 text-fluid-xs font-medium text-muted-foreground backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-bright)]" />
                Apoio jurídico instantâneo
              </span>
              <h1 className="mt-3 text-fluid-2xl font-bold tracking-tight">
                Dúvidas com <span className="text-gradient-brand">IA</span>
              </h1>
              <p className="measure mt-1.5 text-fluid-sm text-muted-foreground">
                Enquadramento legal, penas e qual documento é adequado para a ocorrência.
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="btn-ghost-line inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Limpar conversa
              </button>
            )}
          </div>
        </div>

        <div className="surface-card min-h-[420px] rounded-2xl p-4 sm:p-5">
          {messages.length === 0 && (
            <div className="reveal py-10 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[var(--gradient-brand)] p-[1px] shadow-[var(--shadow-sm)]">
                <span className="grid h-full w-full place-items-center rounded-[0.9rem] bg-card">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </span>
              </span>
              <p className="mt-4 text-sm text-muted-foreground">Comece com uma pergunta:</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{ ["--d" as string]: `${80 + i * 60}ms` }}
                    className="reveal lift group rounded-xl border border-[var(--surface-line)] bg-background/50 p-3 text-left text-xs leading-relaxed transition-colors duration-300 hover:border-primary/40 hover:bg-accent/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex animate-fade-in ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-[var(--shadow-sm)] ${
                    m.role === "user"
                      ? "rounded-br-md bg-[var(--gradient-brand)] text-primary-foreground"
                      : "rounded-bl-md border border-[var(--surface-line)] bg-muted/50 text-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <Suspense fallback={<p className="whitespace-pre-wrap">{m.content}</p>}>
                      <MarkdownRenderer content={m.content} />
                    </Suspense>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-[var(--surface-line)] bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Consultando...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="glass mt-3 flex items-end gap-2 rounded-2xl border border-[var(--surface-line)] p-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={2}
            placeholder="Escreva sua pergunta..."
            className="flex-1 resize-none rounded-xl bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/70"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-brand inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-medium disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> <span className="hidden sm:inline">Enviar</span>
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Respostas geradas por IA. Sem histórico persistente — cada sessão começa em branco.
        </p>
      </div>
    </AppShell>
  );
}

