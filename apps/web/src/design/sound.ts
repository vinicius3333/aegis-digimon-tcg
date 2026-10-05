/* Original oscillator recipes: no recorded samples or external music assets. */
export type SoundKind =
  | "select"
  | "nav"
  | "confirm"
  | "attack"
  | "error"
  | "success"
  | "cardPlay"
  | "digivolve"
  | "attackDeclare"
  | "securityHit"
  | "turnChange"
  | "endTurn"
  | "hatch"
  | "effectFocus"
  | "effectActivate"
  | "handTrash"
  | "sourceTrash"
  | "deDigivolve"
  | "delete"
  | "move"
  | "draw"
  | "shuffle"
  | "reveal"
  | "impact"
  | "buff"
  | "debuff"
  | "freeze"
  | "recover"
  | "group"
  | "win"
  | "lose";

export interface SoundDetails {
  cost?: number;
  sourceLevel?: number;
  targetLevel?: number;
  assembly?: boolean;
}
export interface SoundTone {
  type: OscillatorType;
  from: number;
  to: number;
  duration: number;
  gain: number;
  delay?: number;
}
type Recipe = readonly [OscillatorType, number, number, number, number];
const RECIPES: Record<SoundKind, Recipe> = {
  select: ["sine", 620, 720, 0.06, 0.16],
  nav: ["triangle", 380, 380, 0.045, 0.12],
  confirm: ["sine", 520, 784, 0.12, 0.2],
  attack: ["triangle", 260, 90, 0.16, 0.22],
  error: ["triangle", 300, 150, 0.2, 0.18],
  success: ["sine", 660, 990, 0.22, 0.2],
  cardPlay: ["triangle", 300, 470, 0.15, 0.22],
  digivolve: ["sine", 440, 880, 0.23, 0.2],
  attackDeclare: ["triangle", 320, 110, 0.18, 0.24],
  securityHit: ["triangle", 880, 240, 0.22, 0.2],
  turnChange: ["sine", 392, 523, 0.18, 0.16],
  endTurn: ["triangle", 523, 392, 0.16, 0.16],
  hatch: ["sine", 520, 1180, 0.2, 0.17],
  effectFocus: ["triangle", 740, 1040, 0.16, 0.14],
  effectActivate: ["sine", 660, 880, 0.13, 0.13],
  handTrash: ["triangle", 460, 180, 0.16, 0.15],
  sourceTrash: ["triangle", 740, 280, 0.12, 0.14],
  deDigivolve: ["sine", 980, 245, 0.25, 0.18],
  delete: ["triangle", 160, 45, 0.24, 0.23],
  move: ["sine", 240, 480, 0.12, 0.12],
  draw: ["triangle", 480, 660, 0.08, 0.1],
  shuffle: ["triangle", 180, 420, 0.2, 0.1],
  reveal: ["sine", 660, 990, 0.12, 0.12],
  impact: ["triangle", 120, 40, 0.16, 0.25],
  buff: ["sine", 523, 784, 0.16, 0.12],
  debuff: ["sine", 523, 262, 0.16, 0.12],
  freeze: ["triangle", 220, 200, 0.18, 0.13],
  recover: ["sine", 392, 784, 0.22, 0.14],
  group: ["triangle", 330, 660, 0.18, 0.13],
  win: ["sine", 523, 1046, 0.45, 0.22],
  lose: ["triangle", 330, 110, 0.4, 0.18],
};
const clamp = (value: number, fallback = 0) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback);

/** Pure recipe selection also used by the offline audio demo. */
export function soundTones(kind: SoundKind, details: SoundDetails = {}): SoundTone[] {
  const [type, from, to, duration, gain] = RECIPES[kind];
  const strength =
    kind === "cardPlay"
      ? clamp((details.cost ?? 5) / 15)
      : kind === "digivolve"
        ? clamp(((details.targetLevel ?? 4) - 2) / 5)
        : 0.5;
  const pitch = kind === "cardPlay" ? 1.2 - strength * 0.5 : kind === "digivolve" ? 0.8 + strength * 0.5 : 1;
  const tone = {
    type,
    from: from * pitch,
    to: to * pitch,
    duration: duration * (0.8 + strength * 0.4),
    gain: gain * (0.75 + strength * 0.5),
  };
  const tones: SoundTone[] = [tone];
  if (kind === "digivolve") {
    const jump = Math.min(4, Math.max(1, (details.targetLevel ?? 4) - (details.sourceLevel ?? 3)));
    tones.push({
      type: "sine",
      from: tone.to,
      to: tone.to * (1 + jump / 4),
      duration: 0.12 + jump * 0.025,
      gain: 0.12,
      delay: tone.duration * 0.7,
    });
  }
  if (kind === "cardPlay" && details.assembly) {
    tones.push({ type: "triangle", from: 196, to: 392, duration: 0.18, gain: 0.11, delay: 0.06 });
    tones.push({ type: "sine", from: 784, to: 1176, duration: 0.12, gain: 0.09, delay: 0.16 });
  }
  return tones;
}
function readFlag(key: string, fallback = true): boolean {
  try {
    return localStorage.getItem(key) === null ? fallback : localStorage.getItem(key) !== "false";
  } catch {
    return fallback;
  }
}
function readVolume(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : clamp(Number(raw), fallback);
  } catch {
    return fallback;
  }
}
function persist(key: string, value: number | boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* Guest storage may be unavailable. */
  }
}
let enabled = readFlag("aegis.sound.enabled");
let volume = readVolume("aegis.sound.volume", 0.7);
let musicEnabled = readFlag("aegis.music.enabled");
let musicVolume = readVolume("aegis.music.volume", 0.25);
let context: AudioContext | null = null;
let effectsBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let unlocked = false;
let musicWanted = false;
const voices = new Set<OscillatorNode>();
let musicNodes: OscillatorNode[] = [];
const lastPlayed = new Map<SoundKind, number>();
export const MAX_SOUND_VOICES = 8;
function ramp(bus: GainNode | null, value: number): void {
  if (!bus || !context) return;
  bus.gain.cancelScheduledValues(context.currentTime);
  bus.gain.setTargetAtTime(value, context.currentTime, 0.025);
}
export const isSoundEnabled = () => enabled;
export const getSoundVolume = () => volume;
export function setSoundEnabled(next: boolean): void {
  enabled = next;
  persist("aegis.sound.enabled", next);
  ramp(effectsBus, next ? volume : 0);
}
export function setSoundVolume(next: number): void {
  volume = clamp(next);
  persist("aegis.sound.volume", volume);
  ramp(effectsBus, enabled ? volume : 0);
}
export const isMusicEnabled = () => musicEnabled;
export const getMusicVolume = () => musicVolume;
export function setMusicEnabled(next: boolean): void {
  musicEnabled = next;
  persist("aegis.music.enabled", next);
  syncMusic();
}
export function setMusicVolume(next: number): void {
  musicVolume = clamp(next);
  persist("aegis.music.volume", musicVolume);
  syncMusic();
}

/** Called by trusted input listeners, before an action's delayed presentation. */
export function unlockAudio(): void {
  if (typeof window === "undefined") return;
  try {
    if (!context) {
      const Ctor =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      context = new Ctor();
      limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -8;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.08;
      limiter.connect(context.destination);
      effectsBus = context.createGain();
      effectsBus.gain.value = enabled ? volume : 0;
      effectsBus.connect(limiter);
      musicBus = context.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(limiter);
    }
    unlocked = true;
    if (context.state === "suspended") void context.resume().catch(() => undefined);
    syncMusic();
  } catch {
    /* Unsupported/denied audio must never break interaction. */
  }
}

/** A quiet original open-fifth pad with slow independent amplitude breathing. */
function syncMusic(): void {
  const ctx = context;
  const audible = musicWanted && musicEnabled && musicVolume > 0;
  ramp(musicBus, audible ? musicVolume : 0);
  if (!audible) {
    stopMusicVoices();
    return;
  }
  if (!ctx || !musicBus || !unlocked || musicNodes.length) return;
  for (const [index, frequency] of [98, 146.8324, 196].entries()) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0.023 / (index + 1);
    osc.connect(gain).connect(musicBus);
    const breathe = ctx.createOscillator();
    const depth = ctx.createGain();
    breathe.frequency.value = 0.08 + index * 0.023;
    depth.gain.value = 0.009 / (index + 1);
    breathe.connect(depth).connect(gain.gain);
    osc.start();
    breathe.start();
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
    breathe.onended = () => {
      breathe.disconnect();
      depth.disconnect();
    };
    musicNodes.push(osc, breathe);
  }
}
export function startMusic(): void {
  musicWanted = true;
  syncMusic();
}
function stopMusicVoices(): void {
  for (const node of musicNodes) {
    try {
      node.stop((context?.currentTime ?? 0) + 0.12);
    } catch {
      /* Already stopped. */
    }
  }
  musicNodes = [];
}
export function stopMusic(): void {
  musicWanted = false;
  ramp(musicBus, 0);
  stopMusicVoices();
}

/** Presentation cues never create a context or try to bypass autoplay. */
export function playSound(kind: SoundKind, details?: SoundDetails): void {
  if (!enabled || volume <= 0 || !unlocked || !context || context.state !== "running" || !effectsBus) return;
  const now = context.currentTime;
  if (now - (lastPlayed.get(kind) ?? -Infinity) < 0.075) return;
  const tones = soundTones(kind, details);
  if (voices.size + tones.length > MAX_SOUND_VOICES) return;
  lastPlayed.set(kind, now);
  for (const tone of tones) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    const start = now + (tone.delay ?? 0);
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, tone.to), start + tone.duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(tone.gain, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + tone.duration);
    osc.connect(gain).connect(effectsBus);
    voices.add(osc);
    osc.onended = () => {
      voices.delete(osc);
      osc.disconnect();
      gain.disconnect();
    };
    osc.start(start);
    osc.stop(start + tone.duration + 0.02);
  }
}
export function disposeAudio(): void {
  stopMusic();
  for (const node of voices) {
    try {
      node.stop();
    } catch {
      /* Already stopped. */
    }
  }
  voices.clear();
  lastPlayed.clear();
  const old = context;
  context = null;
  effectsBus = null;
  musicBus = null;
  limiter = null;
  unlocked = false;
  if (old && old.state !== "closed") void old.close().catch(() => undefined);
}
/** App-scoped listeners, with no context allocation until real input. */
export function installAudioLifecycle(): () => void {
  const gesture = (event: Event) => {
    if (event.isTrusted) unlockAudio();
  };
  const visibility = () => {
    if (!context || !unlocked) return;
    if (document.hidden) {
      for (const node of voices) {
        try {
          node.stop();
        } catch {
          /* Already stopped. */
        }
      }
      voices.clear();
      void context.suspend().catch(() => undefined);
    } else void context.resume().catch(() => undefined);
  };
  document.addEventListener("pointerdown", gesture, true);
  document.addEventListener("keydown", gesture, true);
  document.addEventListener("visibilitychange", visibility);
  let restoreMusic = false;
  const pageHide = () => {
    restoreMusic = musicWanted;
    disposeAudio();
  };
  const pageShow = () => {
    if (restoreMusic) {
      startMusic();
      restoreMusic = false;
    }
  };
  window.addEventListener("pagehide", pageHide);
  window.addEventListener("pageshow", pageShow);
  return () => {
    document.removeEventListener("pointerdown", gesture, true);
    document.removeEventListener("keydown", gesture, true);
    document.removeEventListener("visibilitychange", visibility);
    window.removeEventListener("pagehide", pageHide);
    window.removeEventListener("pageshow", pageShow);
    disposeAudio();
  };
}
