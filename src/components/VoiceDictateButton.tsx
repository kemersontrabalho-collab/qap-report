import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Square } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { readTranscriptStream, recordWav, type WavRecording } from "@/lib/voice-recorder";

type Props = {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  className?: string;
};

// Web Speech API (fornecida pelo navegador)
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechResultEvent = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};
type SRConstructor = new () => SR;

function getRecognitionCtor(): SRConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRConstructor;
    webkitSpeechRecognition?: SRConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** iOS instalado na tela inicial não tem reconhecimento nativo confiável. */
function prefersRecording(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  return isIOS && !!standalone;
}

function canRecord(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

const join = (base: string, add: string) => {
  const a = add.replace(/\s+/g, " ").trim();
  if (!a) return base;
  return base ? `${base.replace(/\s+$/, "")} ${a}` : a;
};

const MAX_RECORD_MS = 3 * 60 * 1000;
const FALLBACK_ERRORS = new Set(["service-not-allowed", "network", "language-not-supported", "audio-capture"]);

type Mode = "native" | "record" | "none";
type Status = "idle" | "listening" | "recording" | "transcribing";

export function VoiceDictateButton({ value, onChange, label = "Ditar", className = "" }: Props) {
  const [mode, setMode] = useState<Mode>("native");
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);

  const valueRef = useRef(value);
  valueRef.current = value;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const recogRef = useRef<SR | null>(null);
  const wantRef = useRef(false); // usuário ainda quer ditar (reinicia sessões)
  const baseRef = useRef("");
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<string | null>(null);
  const recRef = useRef<WavRecording | null>(null);
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const native = !!getRecognitionCtor() && !prefersRecording();
    setMode(native ? "native" : canRecord() ? "record" : "none");
  }, []);

  // Agrupa atualizações por quadro: evita travar a digitação/autosave a cada palavra.
  const emit = useCallback((text: string) => {
    pendingRef.current = text;
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingRef.current != null) onChangeRef.current(pendingRef.current);
      pendingRef.current = null;
    });
  }, []);

  const clearTimer = () => {
    if (timerRef.current != null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const cleanupAll = useCallback(() => {
    wantRef.current = false;
    try {
      recogRef.current?.abort();
    } catch {
      // já encerrado
    }
    recogRef.current = null;
    recRef.current?.cancel();
    recRef.current = null;
    abortRef.current?.abort();
    clearTimer();
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }, []);

  useEffect(() => cleanupAll, [cleanupAll]);

  // ---------- Gravação + transcrição no servidor (fallback) ----------
  const stopRecording = useCallback(async () => {
    const rec = recRef.current;
    recRef.current = null;
    clearTimer();
    if (!rec) return;
    setStatus("transcribing");
    try {
      const file = await rec.stop();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sessão expirada. Entre novamente.");
      const form = new FormData();
      form.append("file", file, file.name);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Falha na transcrição. Tente novamente.");
      }
      const base = valueRef.current;
      const text = await readTranscriptStream(res, (partial) => emit(join(base, partial)));
      if (!text) {
        toast.message("Nenhuma fala reconhecida. Tente falar mais perto do microfone.");
        emit(base);
      } else {
        emit(join(base, text));
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        toast.error(e instanceof Error ? e.message : "Falha na transcrição.");
      }
    } finally {
      abortRef.current = null;
      setStatus("idle");
    }
  }, [emit]);

  const startRecording = useCallback(async () => {
    try {
      const rec = await recordWav();
      recRef.current = rec;
      setSeconds(0);
      setStatus("recording");
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        setSeconds(Math.floor(elapsed / 1000));
        if (elapsed >= MAX_RECORD_MS) void stopRecording();
      }, 500);
    } catch (e) {
      const name = (e as Error)?.name;
      toast.error(
        name === "NotAllowedError" || name === "SecurityError"
          ? "Permissão de microfone negada. Libere o microfone nas configurações do aparelho."
          : name === "NotFoundError"
            ? "Nenhum microfone encontrado."
            : "Não foi possível acessar o microfone.",
      );
      setStatus("idle");
    }
  }, [stopRecording]);

  // ---------- Reconhecimento nativo do navegador ----------
  const startNativeSession = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return false;
    const recog = new Ctor();
    recog.lang = "pt-BR";
    // Sessões curtas reiniciadas automaticamente: evita o bug do Android
    // (resultados duplicados) e o encerramento silencioso após pausas.
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript + " ";
      }
      if (finalText.trim()) {
        baseRef.current = join(baseRef.current, finalText);
        emit(join(baseRef.current, interim));
      } else {
        emit(join(baseRef.current, interim));
      }
    };
    recog.onerror = (e) => {
      const err = e?.error ?? "";
      if (err === "no-speech" || err === "aborted") return; // onend reinicia
      wantRef.current = false;
      if (err === "not-allowed") {
        toast.error("Permissão de microfone negada. Libere o microfone nas configurações do aparelho.");
        return;
      }
      if (FALLBACK_ERRORS.has(err) && canRecord()) {
        setMode("record");
        toast.message("Reconhecimento do navegador indisponível. Toque no microfone para gravar e transcrever.");
        return;
      }
      toast.error("Erro no ditado por voz. Tente novamente.");
    };
    recog.onend = () => {
      emit(baseRef.current);
      if (wantRef.current && recogRef.current === recog) {
        // Pequeno atraso: Chrome lança InvalidStateError se reiniciar no mesmo tick.
        window.setTimeout(() => {
          if (!wantRef.current || recogRef.current !== recog) return;
          if (!startNativeSession()) {
            wantRef.current = false;
            setStatus("idle");
          }
        }, 150);
      } else {
        recogRef.current = null;
        setStatus("idle");
      }
    };

    try {
      recog.start();
      recogRef.current = recog;
      return true;
    } catch {
      return false;
    }
  }, [emit]);

  const startNative = useCallback(() => {
    baseRef.current = valueRef.current.replace(/\s+$/, "");
    wantRef.current = true;
    if (startNativeSession()) {
      setStatus("listening");
    } else {
      wantRef.current = false;
      if (canRecord()) {
        setMode("record");
        void startRecording();
      } else {
        toast.error("Não foi possível iniciar o ditado.");
      }
    }
  }, [startNativeSession, startRecording]);

  const stopNative = useCallback(() => {
    wantRef.current = false;
    try {
      recogRef.current?.stop();
    } catch {
      // já encerrado
    }
    setStatus("idle");
  }, []);

  const onClick = () => {
    if (status === "transcribing") return;
    if (status === "listening") return stopNative();
    if (status === "recording") return void stopRecording();
    if (mode === "native") return startNative();
    if (mode === "record") return void startRecording();
    toast.error("Ditado por voz não suportado neste navegador.");
  };

  if (mode === "none") return null;

  const active = status === "listening" || status === "recording";
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");
  const text =
    status === "listening"
      ? "Ouvindo… toque p/ parar"
      : status === "recording"
        ? `Gravando ${mm}:${ss} — parar`
        : status === "transcribing"
          ? "Transcrevendo…"
          : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={status === "transcribing"}
      title={active ? "Parar ditado" : "Ditar por voz"}
      aria-label={active ? "Parar ditado" : "Ditar por voz"}
      aria-pressed={active}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition disabled:opacity-70 ${
        active ? "border-destructive bg-destructive/10 text-destructive" : "hover:bg-accent"
      } ${className}`}
    >
      {status === "transcribing" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status === "recording" ? (
        <Square className="h-3 w-3" />
      ) : active ? (
        <MicOff className="h-3 w-3" />
      ) : (
        <Mic className="h-3 w-3" />
      )}
      {active && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" aria-hidden />}
      {text}
    </button>
  );
}
