import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, PhoneOff, Volume2, AudioLines } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLiveVoice, type LiveEvent } from "@/hooks/use-live-voice";

type Row = { id: number; role: "user" | "assistant"; text: string };

const STATUS_LABEL: Record<string, string> = {
  idle: "Pronta para conversar",
  connecting: "Conectando…",
  connected: "Ouvindo — pode falar",
  stopping: "Encerrando…",
  closed: "Conversa encerrada",
};

/** Conversa por voz em tempo real com a assistente jurídica (mãos livres). */
export function VoiceConversation() {
  const [rows, setRows] = useState<Row[]>([]);
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const onEvent = useCallback((event: LiveEvent) => {
    if (
      event.type === "session.input_transcript.delta" ||
      event.type === "session.output_transcript.delta"
    ) {
      const delta = typeof event.delta === "string" ? event.delta : "";
      if (!delta) return;
      const role = event.type === "session.input_transcript.delta" ? "user" : "assistant";
      setRows((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.role === role) {
          return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
        }
        return [...prev, { id: nextId.current++, role, text: delta }];
      });
    } else if (event.type === "app.delegation.pending") {
      setThinking(true);
    } else if (event.type === "app.answer" || event.type === "app.closed") {
      setThinking(false);
    }
  }, []);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }, []);

  const voice = useLiveVoice({ onEvent, getToken });
  const idle = voice.status === "idle" || voice.status === "closed";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [rows, thinking]);

  function start() {
    setRows([]);
    setThinking(false);
    voice.start();
  }

  return (
    <div className="surface-card rounded-2xl p-4 sm:p-5">
      {/* Mantido montado durante toda a chamada para tocar a voz da assistente. */}
      <audio ref={voice.audioRef} className="hidden" />

      <div className="flex flex-col items-center py-4 text-center">
        <span
          className={`grid h-20 w-20 place-items-center rounded-full bg-[var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-sm)] ${
            voice.status === "connected" ? "animate-pulse" : ""
          }`}
        >
          {voice.status === "connecting" || voice.status === "stopping" ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <AudioLines className="h-8 w-8" />
          )}
        </span>
        <p role="status" className="mt-3 text-sm font-medium">
          {voice.muted && voice.status === "connected" ? "Microfone silenciado" : STATUS_LABEL[voice.status]}
        </p>
        {thinking && voice.status === "connected" && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> Consultando a legislação…
          </p>
        )}
        {voice.error && (
          <p role="alert" className="mt-2 max-w-sm text-xs text-destructive">
            {voice.error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {idle ? (
            <button
              onClick={start}
              className="btn-brand inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-medium"
            >
              <Mic className="h-4 w-4" /> {voice.status === "closed" ? "Nova conversa" : "Começar a conversar"}
            </button>
          ) : (
            <>
              <button
                onClick={() => voice.setMuted(!voice.muted)}
                disabled={voice.status !== "connected"}
                className="btn-ghost-line inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm disabled:opacity-50"
              >
                {voice.muted ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                {voice.muted ? "Ativar microfone" : "Silenciar"}
              </button>
              <button
                onClick={voice.stop}
                disabled={voice.status === "stopping"}
                className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-destructive px-5 text-sm font-medium text-destructive-foreground disabled:opacity-50"
              >
                <PhoneOff className="h-4 w-4" /> Encerrar
              </button>
            </>
          )}
          {voice.playbackBlocked && (
            <button
              onClick={voice.resumePlayback}
              className="btn-ghost-line inline-flex min-h-12 items-center gap-2 rounded-xl px-4 text-sm"
            >
              <Volume2 className="h-4 w-4" /> Ouvir resposta
            </button>
          )}
        </div>
        {idle && (
          <p className="measure mt-4 text-xs text-muted-foreground">
            Fale sua dúvida em voz alta e a assistente responde falando. Você pode interromper a qualquer
            momento. Nada da conversa é salvo.
          </p>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-2 max-h-[340px] space-y-3 overflow-y-auto border-t border-[var(--surface-line)] pt-4">
          {rows.map((r) => (
            <div key={r.id} className={`flex ${r.role === "user" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                  r.role === "user"
                    ? "rounded-br-md bg-primary/10 text-foreground"
                    : "rounded-bl-md border border-[var(--surface-line)] bg-muted/50 text-foreground"
                }`}
              >
                {r.text}
              </p>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}
    </div>
  );
}
