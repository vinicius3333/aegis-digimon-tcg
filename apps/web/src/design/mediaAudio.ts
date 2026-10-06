import { AUDIO_CUES, MUSIC_URL } from "./audioBank";
import { cueKey, type SoundDetails, type SoundKind } from "./audioRecipes";

export function needsMediaAudio(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent) && /\b(?:OPR|Opera|OPT)\b/i.test(navigator.userAgent);
}

/** Copy authored PCM frames into finite WAV files; stopping never depends on a JS timer or sprite seek. */
export function splitCueWav(bytes: ArrayBuffer): Map<string, ArrayBuffer> {
  const view = new DataView(bytes);
  const tag = (at: number) => String.fromCharCode(...new Uint8Array(bytes, at, 4));
  if (bytes.byteLength < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Invalid cue WAV");
  let format = 0,
    data = 0,
    length = 0;
  for (let at = 12; at + 8 <= bytes.byteLength;) {
    const size = view.getUint32(at + 4, true);
    if (at + 8 + size > bytes.byteLength) throw new Error("Truncated cue WAV");
    if (tag(at) === "fmt " && size >= 16) format = at + 8;
    if (tag(at) === "data") {
      data = at + 8;
      length = size;
    }
    at += 8 + size + (size % 2);
  }
  if (!format || !data || view.getUint16(format, true) !== 1 || view.getUint16(format + 14, true) !== 16)
    throw new Error("Expected PCM16 cue WAV");
  const rate = view.getUint32(format + 4, true);
  const frameBytes = view.getUint16(format + 12, true);
  if (!rate || !frameBytes || length % frameBytes) throw new Error("Invalid cue frames");
  const clips = new Map<string, ArrayBuffer>();
  for (const [key, cue] of Object.entries(AUDIO_CUES)) {
    const start = Math.round(cue.offset * rate) * frameBytes;
    const size = Math.round(cue.duration * rate) * frameBytes;
    if (start + size > length) throw new Error("Cue exceeds bank");
    const clip = new ArrayBuffer(44 + size);
    const output = new Uint8Array(clip);
    const header = new DataView(clip);
    output.set(new TextEncoder().encode("RIFF"), 0);
    header.setUint32(4, 36 + size, true);
    output.set(new TextEncoder().encode("WAVEfmt "), 8);
    header.setUint32(16, 16, true);
    output.set(new Uint8Array(bytes, format, 16), 20);
    output.set(new TextEncoder().encode("data"), 36);
    header.setUint32(40, size, true);
    output.set(new Uint8Array(bytes, data + start, size), 44);
    clips.set(key, clip);
  }
  return clips;
}

interface Settings {
  enabled: boolean;
  effectsVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
  musicWanted: boolean;
}
type Voice = { player: HTMLAudioElement; busy: boolean; ticket: number };

/** Android Opera compatibility path: no AudioContext, compressor or looping audio sprite. */
export class MediaAudio {
  private readonly music = new Audio(MUSIC_URL);
  private readonly voices: Voice[];
  private readonly urls = new Map<string, string>();
  private readonly lastPlayed = new Map<SoundKind, number>();
  private unlocked = false;
  private disposed = false;
  private musicPending = false;
  private musicTicket = 0;

  constructor(
    private readonly settings: () => Settings,
    limit: number,
  ) {
    this.music.preload = "auto";
    this.music.loop = true;
    this.voices = Array.from({ length: limit }, () => {
      const voice: Voice = { player: new Audio(), busy: false, ticket: 0 };
      voice.player.preload = "auto";
      voice.player.onended = voice.player.onerror = () => {
        voice.busy = false;
      };
      return voice;
    });
  }

  prepare(bytes: ArrayBuffer): void {
    if (this.disposed || this.urls.size) return;
    for (const [key, clip] of splitCueWav(bytes))
      this.urls.set(key, URL.createObjectURL(new Blob([clip], { type: "audio/wav" })));
  }

  unlock(): void {
    this.unlocked = true;
    this.sync();
  }

  sync(): void {
    const settings = this.settings();
    for (const { player, busy } of this.voices) {
      if (!busy) continue;
      player.muted = !settings.enabled;
      player.volume = settings.effectsVolume;
    }
    this.music.volume = settings.musicVolume;
    if (
      this.disposed ||
      !this.unlocked ||
      document.hidden ||
      !settings.musicWanted ||
      !settings.musicEnabled ||
      settings.musicVolume <= 0
    ) {
      this.musicTicket++;
      this.musicPending = false;
      this.music.pause();
      return;
    }
    if (!this.music.paused || this.musicPending) return;
    const ticket = ++this.musicTicket;
    this.musicPending = true;
    void this.music
      .play()
      .catch(() => undefined)
      .then(() => {
        if (ticket === this.musicTicket) this.musicPending = false;
      });
  }

  play(kind: SoundKind, details?: SoundDetails): void {
    const settings = this.settings();
    if (this.disposed || !this.unlocked || !settings.enabled || settings.effectsVolume <= 0 || document.hidden) return;
    const now = performance.now();
    if (now - (this.lastPlayed.get(kind) ?? -Infinity) < 75) return;
    const url = this.urls.get(cueKey(kind, details));
    const voice = this.voices.find((candidate) => !candidate.busy);
    if (!url || !voice) return;
    this.lastPlayed.set(kind, now);
    voice.busy = true;
    const ticket = ++voice.ticket;
    voice.player.src = url;
    voice.player.loop = false;
    voice.player.muted = false;
    voice.player.volume = settings.effectsVolume;
    void voice.player.play().catch(() => {
      if (voice.ticket === ticket) voice.busy = false;
    });
  }

  stop(): void {
    this.musicTicket++;
    this.musicPending = false;
    this.music.pause();
    for (const voice of this.voices) {
      voice.ticket++;
      voice.player.pause();
      voice.busy = false;
    }
    this.lastPlayed.clear();
  }

  dispose(): void {
    this.disposed = true;
    this.stop();
    for (const player of [this.music, ...this.voices.map((voice) => voice.player)]) {
      player.onended = player.onerror = null;
      player.removeAttribute("src");
      player.load();
    }
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
