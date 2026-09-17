type SoundName = "generated" | "saved" | "completed" | "deleted";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextClass = window.AudioContext;
  if (!AudioContextClass) return null;
  audioContext ??= new AudioContextClass();
  return audioContext;
}

/**
 * Chame durante o clique que inicia uma ação assíncrona. Isso libera o áudio
 * no Safari/iOS para que a confirmação possa tocar quando a ação terminar.
 */
export function prepareUiSounds() {
  const context = getAudioContext();
  if (context?.state === "suspended") void context.resume();
}

const patterns: Record<SoundName, Array<[frequency: number, delay: number, duration: number]>> = {
  generated: [
    [523.25, 0, 0.1],
    [659.25, 0.11, 0.1],
    [783.99, 0.22, 0.16],
  ],
  saved: [[659.25, 0, 0.13]],
  completed: [
    [659.25, 0, 0.11],
    [880, 0.12, 0.18],
  ],
  deleted: [
    [329.63, 0, 0.1],
    [246.94, 0.1, 0.16],
  ],
};

export function playUiSound(name: SoundName) {
  const context = getAudioContext();
  if (!context || context.state !== "running") return;

  const startedAt = context.currentTime + 0.01;
  for (const [frequency, delay, duration] of patterns[name]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const noteStart = startedAt + delay;
    const noteEnd = noteStart + duration;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, noteStart);
    gain.gain.setValueAtTime(0.0001, noteStart);
    gain.gain.exponentialRampToValueAtTime(0.075, noteStart + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(noteStart);
    oscillator.stop(noteEnd + 0.02);
  }
}