import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useServerFn } from "@tanstack/react-start";
import { askAI } from "@/lib/bulletins.functions";
import { toast } from "sonner";
import { Send, Loader2, MessageCircle, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/ai-chat")({
  head: () => ({
    meta: [
      { title: "Dúvidas com IA · QAP Report" },
      {
        name: "description",
        content: "Tire dúvidas jurídico-policiais: enquadramento legal, penas e qual documento usar.",
      },
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
      toast.error(`Limite de ${MAX_MESSAGES} mensagens por sessão atingido. Limpe o chat para continuar.`);
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
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dúvidas com IA</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tire dúvidas sobre enquadramento legal, penas e qual documento é adequado.
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs hover:bg-accent"
            >
              <Trash2 className="h-3.5 w-3.5" /> Limpar
            </button>
          )}
        </div>

        <div className="min-h-[420px] rounded-2xl border bg-card p-4">
          {messages.length === 0 && (
            <div className="py-8 text-center">
              <MessageCircle className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Comece com uma pergunta:</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border p-3 text-left text-xs hover:border-primary/40 hover:bg-accent"
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
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-accent px-4 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Consultando...
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
          className="mt-3 flex items-end gap-2"
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
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Enviar
          </button>
        </form>
        <p className="mt-2 text-xs text-muted-foreground">
          Respostas geradas por IA. Sem histórico persistente — cada sessão começa em branco.
        </p>
      </div>
    </AppShell>
  );
}
