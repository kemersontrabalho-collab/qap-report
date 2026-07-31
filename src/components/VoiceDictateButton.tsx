import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { toast } from "sonner";

type Props = {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  className?: string;
};

// Web Speech API types (browser-provided)
type SR = any;

function getRecognitionCtor(): any | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function VoiceDictateButton({ value, onChange, label = "Ditar", className = "" }: Props) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recogRef = useRef<SR | null>(null);
  const baseRef = useRef<string>("");

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      try {
        recogRef.current?.stop?.();
      } catch {}
    };
  }, []);

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast.error("Ditado por voz não suportado neste navegador. Use Chrome ou Edge.");
      return;
    }
    const recog: SR = new Ctor();
    recog.lang = "pt-BR";
    recog.continuous = true;
    recog.interimResults = true;

    baseRef.current = value ? value.replace(/\s+$/, "") + " " : "";

    recog.onresult = (event: any) => {
      let finalText = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (finalText) {
        baseRef.current = (baseRef.current + finalText).replace(/\s+/g, " ").trim() + " ";
        onChange(baseRef.current);
      } else if (interim) {
        onChange((baseRef.current + interim).trim());
      }
    };
    recog.onerror = (e: any) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        toast.error("Permissão de microfone negada.");
      } else if (e?.error === "no-speech") {
        // silencioso
      } else {
        toast.error("Erro no ditado por voz.");
      }
      setListening(false);
    };
    recog.onend = () => setListening(false);

    try {
      recog.start();
      recogRef.current = recog;
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  const stop = () => {
    try {
      recogRef.current?.stop?.();
    } catch {}
    setListening(false);
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={listening ? "Parar ditado" : "Ditar por voz"}
      aria-label={listening ? "Parar ditado" : "Ditar por voz"}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
        listening ? "border-red-500 bg-red-500/10 text-red-600 animate-pulse" : "hover:bg-accent"
      } ${className}`}
    >
      {listening ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
      {listening ? "Ouvindo..." : label}
    </button>
  );
}
