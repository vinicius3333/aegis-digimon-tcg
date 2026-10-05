import { cueKey, type SoundKind, type SoundDetails } from "./audioRecipes";
import { AUDIO_BANK_URL, AUDIO_CUES, MUSIC_URL } from "./audioBank";
export type { SoundKind, SoundDetails } from "./audioRecipes";
const clamp = (value: number, fallback = 0) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback);

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
const voices = new Set<AudioBufferSourceNode>();
type MusicVoice = { node: AudioBufferSourceNode; gate: GainNode };
let musicVoices: MusicVoice[] = [];
let retiringMusic: AudioBufferSourceNode[] = [];
let musicOrigin: number | null = null;
let cueBuffer: AudioBuffer | null = null;
let musicBuffer: AudioBuffer | null = null;
const assets = new Map<string, Promise<ArrayBuffer>>();
const decoding = new Map<string, Promise<void>>();
let epoch = 0;

/** Network starts at app mount; each buffer decodes independently only in a gesture-created context. */
export async function prepareAudio(): Promise<void> {
  const urls = [AUDIO_BANK_URL, MUSIC_URL];
  await Promise.all(
    urls.map(async (url) => {
      let request = assets.get(url);
      try {
        if (!request) {
          request = fetch(url).then((response) => {
            if (!response.ok) throw new Error("Audio bank unavailable");
            return response.arrayBuffer();
          });
          assets.set(url, request);
        }
        const bytes = await request;
        const ctx = context;
        const isMusic = url === MUSIC_URL;
        if (!ctx || !unlocked || (isMusic ? musicBuffer : cueBuffer)) return;
        let task = decoding.get(url);
        if (!task) {
          const generation = epoch;
          task = ctx
            .decodeAudioData(bytes.slice(0))
            .then((buffer) => {
              if (context !== ctx || epoch !== generation) return;
              if (isMusic) musicBuffer = buffer;
              else cueBuffer = buffer;
              syncMusic();
            })
            .catch(() => undefined);
          decoding.set(url, task);
          const ownTask = task;
          void task.then(() => {
            if (decoding.get(url) === ownTask) decoding.delete(url);
          });
        }
        await task;
      } catch {
        if (assets.get(url) === request) assets.delete(url);
        /* Offline/unsupported assets are silent; stale presentation cues are never replayed. */
      }
    }),
  );
}
const lastPlayed = new Map<SoundKind, number>();
export const MAX_SOUND_VOICES = 8;
// Eight authored peaks <= .30 plus music <= .08 remain below full scale even at both controls = 1.
export const SFX_MIX_GAIN = 0.38;
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
  ramp(effectsBus, next ? volume * SFX_MIX_GAIN : 0);
}
export function setSoundVolume(next: number): void {
  volume = clamp(next);
  persist("aegis.sound.volume", volume);
  ramp(effectsBus, enabled ? volume * SFX_MIX_GAIN : 0);
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
      effectsBus.gain.value = enabled ? volume * SFX_MIX_GAIN : 0;
      effectsBus.connect(limiter);
      musicBus = context.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(limiter);
    }
    unlocked = true;
    if (context.state === "suspended")
      void context
        .resume()
        .then(syncMusic)
        .catch(() => undefined);
    void prepareAudio();
    syncMusic();
  } catch {
    /* Unsupported/denied audio must never break interaction. */
  }
}

/** One steady original score, prepared outside presentation callbacks. */
function syncMusic(): void {
  const ctx = context;
  const audible = musicWanted && musicEnabled && musicVolume > 0;
  ramp(musicBus, audible ? musicVolume : 0);
  if (!audible) {
    stopMusicVoices();
    return;
  }
  if (!ctx || ctx.state !== "running" || !musicBus || !unlocked || musicVoices.length || !musicBuffer) return;
  const when = ctx.currentTime + 0.02;
  musicOrigin ??= when;
  const offset = (when - musicOrigin) % musicBuffer.duration;
  const node = ctx.createBufferSource(),
    gate = ctx.createGain();
  node.buffer = musicBuffer;
  node.loop = true;
  gate.gain.setValueAtTime(0, ctx.currentTime);
  gate.gain.linearRampToValueAtTime(1, when + 0.08);
  node.connect(gate).connect(musicBus);
  node.onended = () => {
    node.disconnect();
    gate.disconnect();
    retiringMusic = retiringMusic.filter((retiring) => retiring !== node);
  };
  node.start(when, offset);
  musicVoices = [{ node, gate }];
}
export function startMusic(): void {
  musicWanted = true;
  syncMusic();
}
function stopMusicVoices(): void {
  if (!musicVoices.length) return;
  for (const node of retiringMusic) {
    try {
      node.stop();
    } catch {
      /* Already stopped. */
    }
  }
  retiringMusic = [];
  const now = context?.currentTime ?? 0;
  for (const { node, gate } of musicVoices) {
    try {
      gate.gain.cancelScheduledValues(now);
      gate.gain.setTargetAtTime(0, now, 0.02);
      node.stop(now + 0.12);
      retiringMusic.push(node);
    } catch {
      /* Already stopped. */
    }
  }
  musicVoices = [];
}
export function stopMusic(): void {
  musicWanted = false;
  ramp(musicBus, 0);
  stopMusicVoices();
}

/** Presentation cues never create a context or try to bypass autoplay. */
export function playSound(kind: SoundKind, details?: SoundDetails): void {
  if (!enabled || volume <= 0 || !unlocked || !context || context.state !== "running" || !effectsBus || !cueBuffer)
    return;
  const now = context.currentTime;
  if (now - (lastPlayed.get(kind) ?? -Infinity) < 0.075 || voices.size >= MAX_SOUND_VOICES) return;
  const cue = AUDIO_CUES[cueKey(kind, details)];
  if (!cue) return;
  lastPlayed.set(kind, now);
  const node = context.createBufferSource();
  node.buffer = cueBuffer;
  node.connect(effectsBus);
  voices.add(node);
  node.onended = () => {
    voices.delete(node);
    node.disconnect();
  };
  // Offset/duration select a finished original clip. No fetch, decode, render or oscillator graph here.
  node.start(now, cue.offset, cue.duration);
}
export function disposeAudio(): void {
  epoch++;
  decoding.clear();
  cueBuffer = null;
  musicBuffer = null;
  musicOrigin = null;
  stopMusic();
  for (const node of retiringMusic) {
    try {
      node.stop();
    } catch {
      /* Already stopped. */
    }
  }
  retiringMusic = [];
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
  void prepareAudio();
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
    } else
      void context
        .resume()
        .then(syncMusic)
        .catch(() => undefined);
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
