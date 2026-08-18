// Lightweight notification chime using the Web Audio API (no asset needed).
let ctx: AudioContext | null = null;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
};

/** Plays a short two-note "chime". Safe to call from event handlers/realtime callbacks. */
export const playChime = (): void => {
  try {
    const audio = getCtx();
    if (!audio) return;
    if (audio.state === "suspended") void audio.resume();

    const now = audio.currentTime;
    const notes = [
      { freq: 880, at: 0 },
      { freq: 1320, at: 0.12 },
    ];

    notes.forEach(({ freq, at }) => {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + at);
      gain.gain.linearRampToValueAtTime(0.18, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.35);
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.4);
    });
  } catch {
    // ignore audio failures (autoplay policy, unsupported browser)
  }
};
