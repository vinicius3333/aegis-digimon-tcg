/* Synthesized UI feedback sounds (Web Audio). No audio assets: every cue is a
   short oscillator envelope generated on the fly, so it works offline and is
   trivial to retune. One AudioContext is created lazily on the first cue (a user
   gesture is always the trigger, satisfying the browser autoplay policy). */

export type SoundKind = "select" | "nav" | "confirm" | "attack" | "error" | "success";

const STORAGE_ENABLED = "aegis.sound.enabled";
const STORAGE_VOLUME = "aegis.sound.volume";

interface Tone {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
}

/** Per-cue oscillator recipe. `to` sweeps the frequency across `duration`. */
const TONES: Record<SoundKind, Tone> = {
  select: { type: "sine", from: 620, to: 720, duration: 0.06, gain: 0.22 },
  nav: { type: "triangle", from: 380, to: 380, duration: 0.045, gain: 0.16 },
  confirm: { type: "sine", from: 520, to: 784, duration: 0.12, gain: 0.28 },
  attack: { type: "sawtooth", from: 260, to: 90, duration: 0.16, gain: 0.3 },
  error: { type: "square", from: 300, to: 150, duration: 0.2, gain: 0.22 },
  success: { type: "sine", from: 660, to: 990, duration: 0.22, gain: 0.26 },
};

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_ENABLED) !== "false";
  } catch {
    return true;
  }
}

function readVolume(): number {
  try {
    const raw = localStorage.getItem(STORAGE_VOLUME);
    const parsed = raw == null ? 0.7 : Number(raw);
    return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0.7;
  } catch {
    return 0.7;
  }
}

let enabled = readEnabled();
let masterVolume = readVolume();
let context: AudioContext | null = null;
let lastPlayedAt = 0;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!context) context = new Ctor();
  if (context.state === "suspended") void context.resume();
  return context;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(next: boolean): void {
  enabled = next;
  try {
    localStorage.setItem(STORAGE_ENABLED, String(next));
  } catch {
    // ignore persistence failures (private mode / disabled storage)
  }
}

export function getSoundVolume(): number {
  return masterVolume;
}

export function setSoundVolume(next: number): void {
  masterVolume = Math.min(1, Math.max(0, next));
  try {
    localStorage.setItem(STORAGE_VOLUME, String(masterVolume));
  } catch {
    // ignore persistence failures
  }
}

/** Play a UI cue. Silently no-ops when disabled, muted, or Web Audio is absent. */
export function playSound(kind: SoundKind): void {
  if (!enabled || masterVolume <= 0) return;
  const ctx = ensureContext();
  if (!ctx) return;

  // Coalesce cues fired in the same tick (e.g. a click that both navigates and
  // selects) so they don't stack into a click.
  const now = ctx.currentTime;
  if (now - lastPlayedAt < 0.01) return;
  lastPlayedAt = now;

  const tone = TONES[kind];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = tone.type;
  osc.frequency.setValueAtTime(tone.from, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), now + tone.duration);

  const peak = tone.gain * masterVolume;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + tone.duration + 0.02);
}
