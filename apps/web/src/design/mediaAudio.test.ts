// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUDIO_CUES, MUSIC_URL } from "./audioBank";
import { needsMediaAudio, splitCueWav } from "./mediaAudio";
import * as sound from "./sound";

const bank = readFileSync("public/audio/aegis-cues-v2.wav");
const bytes = bank.buffer.slice(bank.byteOffset, bank.byteOffset + bank.byteLength) as ArrayBuffer;
class Player {
  static instances: Player[] = [];
  paused = true;
  loop = false;
  muted = false;
  volume = 1;
  preload = "";
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public src = "") {
    Player.instances.push(this);
  }
  play = vi.fn<() => Promise<void>>(async () => {
    this.paused = false;
  });
  pause = vi.fn<() => void>(() => {
    this.paused = true;
  });
  load = vi.fn<() => void>();
  removeAttribute = vi.fn<() => void>(() => {
    this.src = "";
  });
}
const createURL = vi.fn<() => string>();
const revokeURL = vi.fn<(url: string) => void>();
beforeEach(() => {
  Player.instances = [];
  createURL.mockReset().mockImplementation(() => `blob:cue-${createURL.mock.calls.length}`);
  revokeURL.mockReset();
  vi.stubGlobal("Audio", Player);
  vi.stubGlobal("URL", { createObjectURL: createURL, revokeObjectURL: revokeURL });
  vi.stubGlobal("navigator", {
    userAgent: "Mozilla/5.0 (Linux; Android 13; Tablet) Chrome/122 OPR/80",
    maxTouchPoints: 5,
  });
  vi.stubGlobal(
    "AudioContext",
    vi.fn(() => {
      throw new Error("broken Opera Web Audio output");
    }),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => bytes })),
  );
  sound.setSoundEnabled(true);
  sound.setSoundVolume(0.7);
  sound.setMusicEnabled(true);
  sound.setMusicVolume(0.25);
});
afterEach(() => {
  sound.disposeAudio();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function ready() {
  await sound.prepareAudio();
  sound.unlockAudio();
  return Player.instances[0]!;
}

describe("Opera tablet native audio compatibility", () => {
  it.each([
    ["Android OPR/80", 0, true],
    ["Macintosh OPiOS/3", 5, false],
    ["Android OPT/3", 5, true],
    ["Windows OPR/80", 0, false],
    ["Android Chrome/122", 5, false],
    ["iPad Safari/17", 5, false],
  ])("selects native media for %s with %i touch points", (userAgent, maxTouchPoints, expected) => {
    vi.stubGlobal("navigator", { userAgent, maxTouchPoints });
    expect(needsMediaAudio()).toBe(expected);
  });

  it("preserves every authored PCM frame and finite cue duration", () => {
    const clips = splitCueWav(bytes);
    expect(clips.size).toBe(Object.keys(AUDIO_CUES).length);
    for (const [key, clip] of clips) {
      const cue = AUDIO_CUES[key]!;
      const header = new DataView(clip);
      const rate = header.getUint32(24, true);
      const frameBytes = header.getUint16(32, true);
      const frames = Math.round(cue.duration * rate);
      expect(header.getUint32(40, true)).toBe(frames * frameBytes);
      expect(clip.byteLength).toBe(44 + frames * frameBytes);
      const start = 44 + Math.round(cue.offset * rate) * frameBytes;
      expect(new Uint8Array(clip, 44)).toEqual(new Uint8Array(bytes, start, frames * frameBytes));
    }
    expect(() => splitCueWav(new ArrayBuffer(8))).toThrow("Invalid cue WAV");
    expect(() => splitCueWav(bytes.slice(0, 100))).toThrow("Truncated cue WAV");
  });

  it("prepares once without autoplay, then plays music and finite effects without any AudioContext", async () => {
    sound.startMusic();
    await sound.prepareAudio();
    expect(Player.instances.every((player) => player.play.mock.calls.length === 0)).toBe(true);
    const music = await ready();
    expect(music.src).toBe(MUSIC_URL);
    expect(music.loop).toBe(true);
    expect(music.volume).toBe(0.25);
    expect(music.play).toHaveBeenCalledOnce();
    sound.playSound("draw");
    sound.playSound("draw");
    const effects = Player.instances.slice(1);
    expect(effects[0]!.play).toHaveBeenCalledOnce();
    expect(effects[0]!.src).toMatch(/^blob:cue-/);
    expect(effects[0]!.loop).toBe(false);
    expect(effects[0]!.volume).toBeCloseTo(0.7 * sound.SFX_MIX_GAIN);
    expect(AudioContext).not.toHaveBeenCalled();
    expect(createURL).toHaveBeenCalledTimes(Object.keys(AUDIO_CUES).length);
    await sound.prepareAudio();
    expect(createURL).toHaveBeenCalledTimes(Object.keys(AUDIO_CUES).length);
  });

  it("bounds overlap, recovers ended or denied slots and updates channel controls", async () => {
    const music = await ready();
    sound.startMusic();
    const kinds = ["draw", "nav", "select", "confirm", "attack", "error", "success", "impact", "buff"] as const;
    kinds.forEach((kind) => sound.playSound(kind));
    const effects = Player.instances.slice(1);
    expect(effects.filter((player) => !player.paused)).toHaveLength(sound.MAX_SOUND_VOICES);
    effects[0]!.onended?.();
    sound.playSound("buff");
    expect(effects[0]!.play).toHaveBeenCalledTimes(2);
    sound.setSoundVolume(0.3);
    expect(effects.every((player) => player.volume === 0.3 * sound.SFX_MIX_GAIN)).toBe(true);
    sound.setSoundEnabled(false);
    expect(effects.every((player) => player.muted)).toBe(true);
    expect(music.paused).toBe(false);
    sound.setMusicVolume(0.4);
    expect(music.volume).toBe(0.4);
    sound.setMusicEnabled(false);
    expect(music.paused).toBe(true);
    sound.setSoundEnabled(true);
    effects[0]!.onended?.();
    effects[0]!.play.mockRejectedValueOnce(new Error("autoplay denied"));
    sound.playSound("recover");
    await Promise.resolve();
    sound.playSound("reveal");
    expect(effects[0]!.play).toHaveBeenCalledTimes(4);
  });

  it("pauses hidden playback, restores wanted music and releases all media and blob URLs", async () => {
    const cleanup = sound.installAudioLifecycle();
    try {
      const music = await ready();
      sound.startMusic();
      sound.playSound("draw");
      const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
      expect(Player.instances.every((player) => player.paused)).toBe(true);
      sound.playSound("impact");
      sound.startMusic();
      expect(Player.instances.every((player) => player.paused)).toBe(true);
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
      expect(music.paused).toBe(false);
      sound.stopMusic();
      expect(music.paused).toBe(true);
    } finally {
      cleanup();
    }
    expect(revokeURL).toHaveBeenCalledTimes(Object.keys(AUDIO_CUES).length);
    expect(Player.instances.every((player) => player.src === "" && player.load.mock.calls.length === 1)).toBe(true);
  });
});
