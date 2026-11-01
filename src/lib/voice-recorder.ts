// Gravação de áudio como WAV completo (decodificável em qualquer navegador,
// inclusive Safari/iOS) com redução para 16 kHz mono para arquivos leves.

const TARGET_RATE = 16000;

function downsample(chunks: Float32Array[], fromRate: number): Float32Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Float32Array(total);
  let o = 0;
  for (const c of chunks) {
    merged.set(c, o);
    o += c.length;
  }
  if (fromRate <= TARGET_RATE) return merged;
  const ratio = fromRate / TARGET_RATE;
  const outLen = Math.floor(total / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(total, Math.floor((i + 1) * ratio));
    let sum = 0;
    for (let j = start; j < end; j++) sum += merged[j];
    out[i] = sum / Math.max(1, end - start);
  }
  return out;
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const tag = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s * (s < 0 ? 32768 : 32767), true);
    offset += 2;
  }
  return new Blob([bytes], { type: "audio/wav" });
}

export type WavRecording = { stop: () => Promise<File>; cancel: () => void };

export async function recordWav(): Promise<WavRecording> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  let context: AudioContext | undefined;
  try {
    context = new Ctx();
    await context.resume();
    const ctx = context;
    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    source.connect(node);
    node.connect(ctx.destination);
    let done = false;
    const teardown = () => {
      done = true;
      stream.getTracks().forEach((t) => t.stop());
      node.onaudioprocess = null;
      try {
        node.disconnect();
        source.disconnect();
      } catch {
        // já desconectado
      }
      void ctx.close().catch(() => {});
    };
    return {
      async stop() {
        if (done) throw new Error("Gravação já encerrada");
        const rate = ctx.sampleRate;
        teardown();
        const blob = encodeWav(downsample(chunks, rate), Math.min(rate, TARGET_RATE));
        if (blob.size < 4096) throw new Error("Não foi captado áudio. Tente novamente.");
        return new File([blob], "ditado.wav", { type: "audio/wav" });
      },
      cancel() {
        if (!done) teardown();
      },
    };
  } catch (error) {
    stream.getTracks().forEach((t) => t.stop());
    await context?.close().catch(() => {});
    throw error;
  }
}

/** Lê o stream SSE da transcrição chamando onDelta a cada trecho. */
export async function readTranscriptStream(
  res: Response,
  onDelta: (text: string) => void,
): Promise<string> {
  if (!res.body) throw new Error("Resposta vazia");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  let finalText: string | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const evt = JSON.parse(payload) as { type?: string; delta?: string; text?: string; error?: { message?: string } };
        if (evt.type === "transcript.text.delta" && evt.delta) {
          full += evt.delta;
          onDelta(full);
        } else if (evt.type === "transcript.text.done" && typeof evt.text === "string") {
          finalText = evt.text;
        } else if (evt.error) {
          throw new Error(evt.error.message || "Falha na transcrição");
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
  return (finalText ?? full).trim();
}
