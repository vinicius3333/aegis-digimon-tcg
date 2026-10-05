// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sound from "./sound";

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn<(...args: unknown[]) => void>(),
    exponentialRampToValueAtTime: vi.fn<(...args: unknown[]) => void>(),
    cancelScheduledValues: vi.fn<(...args: unknown[]) => void>(),
    setTargetAtTime: vi.fn<(...args: unknown[]) => void>(),
  };
}
class Node {
  type = "sine";
  frequency = param();
  gain = param();
  onended: (() => void) | null = null;
  connect = vi.fn<() => Node>(() => this);
  disconnect = vi.fn<(...args: unknown[]) => void>();
  start = vi.fn<(...args: unknown[]) => void>();
  stop = vi.fn<(...args: unknown[]) => void>();
}
class Context {
  static instances: Context[] = [];
  state = "suspended";
  currentTime = 1;
  destination = new Node();
  oscillators: Node[] = [];
  gains: Node[] = [];
  constructor() {
    Context.instances.push(this);
  }
  resume = vi.fn<() => Promise<void>>(async () => {
    this.state = "running";
  });
  suspend = vi.fn<() => Promise<void>>(async () => {
    this.state = "suspended";
  });
  close = vi.fn<() => Promise<void>>(async () => {
    this.state = "closed";
  });
  createDynamicsCompressor() {
    return {
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param(),
      connect: vi.fn<(...args: unknown[]) => void>(),
    };
  }
  createOscillator() {
    const node = new Node();
    this.oscillators.push(node);
    return node;
  }
  createGain() {
    const node = new Node();
    this.gains.push(node);
    return node;
  }
}
beforeEach(() => {
  sound.disposeAudio();
  Context.instances = [];
  vi.stubGlobal("AudioContext", Context);
  sound.setSoundEnabled(true);
  sound.setSoundVolume(0.7);
  sound.setMusicEnabled(true);
  sound.setMusicVolume(0.25);
});
afterEach(() => {
  sound.disposeAudio();
  vi.unstubAllGlobals();
});

describe("original recipes", () => {
  it("scales play weight by cost and adds a distinct Assembly accent", () => {
    const light = sound.soundTones("cardPlay", { cost: 2 });
    const heavy = sound.soundTones("cardPlay", { cost: 14 });
    expect(heavy[0]!.from).toBeLessThan(light[0]!.from);
    expect(heavy[0]!.gain).toBeGreaterThan(light[0]!.gain);
    expect(heavy[0]!.duration).toBeGreaterThan(light[0]!.duration);
    expect(sound.soundTones("cardPlay", { cost: 14, assembly: true })).toHaveLength(3);
  });
  it("distinguishes source-level jumps and target level", () => {
    expect(sound.soundTones("digivolve", { sourceLevel: 3, targetLevel: 6 })).not.toEqual(
      sound.soundTones("digivolve", { sourceLevel: 5, targetLevel: 6 }),
    );
    expect(sound.soundTones("digivolve", { sourceLevel: 3, targetLevel: 4 })).not.toEqual(
      sound.soundTones("digivolve", { sourceLevel: 3, targetLevel: 6 }),
    );
    expect(sound.soundTones("sourceTrash")).not.toEqual(sound.soundTones("deDigivolve"));
  });
});

describe("WebAudio lifecycle", () => {
  it("does not allocate a context for autoplay, music start or synthetic input", () => {
    const cleanup = sound.installAudioLifecycle();
    sound.startMusic();
    sound.playSound("cardPlay");
    document.dispatchEvent(new Event("pointerdown"));
    expect(Context.instances).toHaveLength(0);
    cleanup();
  });
  it("warms and resumes once, then bounds voices and coalesces grouped occurrences", () => {
    sound.unlockAudio();
    sound.unlockAudio();
    expect(Context.instances).toHaveLength(1);
    const ctx = Context.instances[0]!;
    sound.playSound("draw");
    sound.playSound("draw");
    expect(ctx.oscillators).toHaveLength(1);
    for (let index = 0; index < 20; index++) {
      ctx.currentTime += 0.1;
      sound.playSound("cardPlay");
    }
    expect(ctx.oscillators).toHaveLength(sound.MAX_SOUND_VOICES);
    ctx.oscillators[0]!.onended?.();
    ctx.currentTime += 0.1;
    sound.playSound("draw");
    expect(ctx.oscillators).toHaveLength(sound.MAX_SOUND_VOICES + 1);
    expect(ctx.oscillators[0]!.disconnect).toHaveBeenCalled();
  });
  it("mutes running effects independently from music and persists finite volumes", () => {
    sound.startMusic();
    sound.unlockAudio();
    const ctx = Context.instances[0]!;
    expect(ctx.oscillators).toHaveLength(6);
    sound.setSoundEnabled(false);
    expect(ctx.gains[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, ctx.currentTime, 0.025);
    sound.playSound("cardPlay");
    expect(ctx.oscillators).toHaveLength(6);
    expect(sound.isMusicEnabled()).toBe(true);
    sound.setMusicVolume(0.45);
    expect(ctx.gains[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.45, ctx.currentTime, 0.025);
    sound.setMusicEnabled(false);
    expect(ctx.gains[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, ctx.currentTime, 0.025);
    expect(localStorage.getItem("aegis.music.enabled")).toBe("false");
    sound.setSoundVolume(NaN);
    sound.setMusicVolume(Infinity);
    expect(sound.getSoundVolume()).toBe(0);
    expect(sound.getMusicVolume()).toBe(0);
  });
  it("suspends when hidden and tears down every voice/context/listener", () => {
    const cleanup = sound.installAudioLifecycle();
    sound.startMusic();
    sound.unlockAudio();
    sound.playSound("effectFocus");
    const ctx = Context.instances[0]!;
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(ctx.suspend).toHaveBeenCalledOnce();
    cleanup();
    expect(ctx.close).toHaveBeenCalledOnce();
    for (const node of ctx.oscillators) expect(node.stop).toHaveBeenCalled();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(ctx.suspend).toHaveBeenCalledOnce();
    vi.restoreAllMocks();
  });
  it("restores match ambience after bfcache only on a fresh trusted gesture", () => {
    const cleanup = sound.installAudioLifecycle();
    sound.startMusic();
    sound.unlockAudio();
    window.dispatchEvent(new Event("pagehide"));
    expect(Context.instances[0]!.state).toBe("closed");
    window.dispatchEvent(new Event("pageshow"));
    expect(Context.instances).toHaveLength(1);
    sound.unlockAudio();
    expect(Context.instances).toHaveLength(2);
    expect(Context.instances[1]!.oscillators).toHaveLength(6);
    cleanup();
  });
  it("tolerates unsupported audio and denied resume", () => {
    vi.stubGlobal("AudioContext", undefined);
    sound.unlockAudio();
    sound.playSound("cardPlay");
    expect(Context.instances).toHaveLength(0);
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "closed";
        constructor() {
          throw new Error("denied");
        }
      },
    );
    expect(() => sound.unlockAudio()).not.toThrow();
  });
});
