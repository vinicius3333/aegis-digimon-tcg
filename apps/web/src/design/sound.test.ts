// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sound from "./sound";
import { AUDIO_CUES } from "./audioBank";
import { MUSIC_TRACK_URLS } from "./musicTracks";

function param() {
  return {
    value: 0,
    setValueAtTime: vi.fn<(...args: unknown[]) => void>(),
    linearRampToValueAtTime: vi.fn<(...args: unknown[]) => void>(),
    cancelScheduledValues: vi.fn<(...args: unknown[]) => void>(),
    setTargetAtTime: vi.fn<(...args: unknown[]) => void>(),
  };
}
class Node {
  buffer: unknown = null;
  loop = false;
  gain = param();
  onended: (() => void) | null = null;
  connect = vi.fn<() => Node>(() => this);
  disconnect = vi.fn<(...args: unknown[]) => void>();
  start = vi.fn<(...args: unknown[]) => void>();
  stop = vi.fn<(...args: unknown[]) => void>();
}
class Context {
  static instances: Context[] = [];
  onstatechange: ((event: Event) => void) | null = null;
  state = "suspended";
  currentTime = 1;
  destination = new Node();
  sources: Node[] = [];
  gains: Node[] = [];
  constructor(readonly options?: AudioContextOptions) {
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
  decodeAudioData = vi.fn<(bytes: ArrayBuffer) => Promise<{ duration: number }>>(async (_bytes: ArrayBuffer) => ({
    duration: 24,
  }));
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
  createBufferSource() {
    const node = new Node();
    this.sources.push(node);
    return node;
  }
  createGain() {
    const node = new Node();
    this.gains.push(node);
    return node;
  }
}
beforeEach(async () => {
  sound.disposeAudio();
  Context.instances = [];
  vi.stubGlobal("AudioContext", Context);
  vi.stubGlobal(
    "fetch",
    vi.fn<() => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>>(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })),
  );
  sound.setSoundEnabled(true);
  sound.setSoundVolume(0.7);
  sound.setMusicEnabled(true);
  sound.setMusicVolume(0.25);
  sound.setMusicTrack("digitalBattle");
  await sound.prepareAudio();
});
afterEach(() => {
  sound.disposeAudio();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function ready() {
  sound.unlockAudio();
  await sound.prepareAudio();
  return Context.instances.at(-1)!;
}

describe("prepared original AudioBuffer mixer", () => {
  it("avoids the Web Audio output path on touch Opera devices", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (Linux; Android 13; Tablet) Chrome/122 Safari/537.36 OPR/80.0.0.0",
      maxTouchPoints: 5,
    });
    await ready();
    expect(Context.instances).toHaveLength(0);
  });
  it("uses buffered output on touch devices and the device's native sample rate", async () => {
    vi.stubGlobal("navigator", { userAgent: navigator.userAgent, maxTouchPoints: 5 });
    const ctx = await ready();
    expect(ctx.options).toEqual({ latencyHint: "playback" });
  });
  it("uses buffered output for Android tablets even without touch capability reporting", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(
      "Mozilla/5.0 (Linux; Android 13; Tablet) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    );
    const ctx = await ready();
    expect(ctx.options).toEqual({ latencyHint: "playback" });
  });
  it.each(["suspended", "interrupted"])(
    "disconnects every source when the mobile audio session is %s and resumes on a gesture",
    async (state) => {
      sound.startMusic();
      const ctx = await ready();
      sound.setMusicEnabled(false);
      sound.setMusicEnabled(true);
      sound.playSound("draw");
      const interruptedSources = [...ctx.sources];
      ctx.state = state;
      ctx.onstatechange?.(new Event("statechange"));
      for (const source of interruptedSources) {
        expect(source.stop).toHaveBeenLastCalledWith();
        expect(source.disconnect).toHaveBeenCalled();
      }
      const resumes = ctx.resume.mock.calls.length;
      sound.unlockAudio();
      await sound.prepareAudio();
      expect(ctx.resume).toHaveBeenCalledTimes(resumes + 1);
      expect(ctx.state).toBe("running");
      expect(ctx.sources).toHaveLength(interruptedSources.length + 1);
      expect(ctx.sources.at(-1)!.loop).toBe(true);
      expect(Context.instances).toHaveLength(1);
    },
  );
  it("disconnects looping music immediately when hidden and never restarts from a pending resume", async () => {
    const cleanup = sound.installAudioLifecycle();
    try {
      sound.startMusic();
      const ctx = await ready();
      sound.playSound("effectFocus");
      const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
      for (const source of ctx.sources) {
        expect(source.stop).toHaveBeenLastCalledWith();
        expect(source.disconnect).toHaveBeenCalled();
      }
      // A late resume or decode callback must not resurrect playback in a hidden tab.
      ctx.state = "running";
      sound.startMusic();
      sound.playSound("draw");
      expect(ctx.sources).toHaveLength(2);
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
      await sound.prepareAudio();
      expect(ctx.sources).toHaveLength(3);
      expect(ctx.sources.at(-1)!.loop).toBe(true);
    } finally {
      cleanup();
    }
  });
  it("does not allocate a context for preload, autoplay, music start or synthetic input", () => {
    const cleanup = sound.installAudioLifecycle();
    sound.startMusic();
    sound.playSound("cardPlay");
    document.dispatchEvent(new Event("pointerdown"));
    expect(Context.instances).toHaveLength(0);
    cleanup();
  });
  it("never fetches/decodes/renders in a presentation cue, bounds eight sources and coalesces occurrences", async () => {
    const ctx = await ready();
    expect(ctx.options).toEqual({ latencyHint: "interactive" });
    sound.unlockAudio();
    expect(Context.instances).toHaveLength(1);
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(fetch).mock.calls.length;
    sound.playSound("draw");
    sound.playSound("draw");
    expect(ctx.sources).toHaveLength(1);
    const cue = AUDIO_CUES.draw!;
    expect(ctx.sources[0]!.start).toHaveBeenCalledWith(1, cue.offset, cue.duration);
    for (let i = 0; i < 20; i++) {
      ctx.currentTime += 0.1;
      sound.playSound("cardPlay", { cost: 14 });
    }
    expect(ctx.sources).toHaveLength(sound.MAX_SOUND_VOICES);
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls.length).toBe(calls);
    ctx.sources[0]!.onended?.();
    ctx.currentTime += 0.1;
    sound.playSound("draw");
    expect(ctx.sources).toHaveLength(sound.MAX_SOUND_VOICES + 1);
    expect(ctx.sources[0]!.disconnect).toHaveBeenCalled();
    expect(sound.MAX_SOUND_VOICES * 0.3 * sound.SFX_MIX_GAIN + 0.08).toBeLessThan(1);
  });
  it("selects different bank occurrences for cost, Assembly and physical level recipes", async () => {
    const ctx = await ready();
    for (const details of [{ cost: 2 }, { cost: 14 }, { cost: 14, assembly: true }]) {
      ctx.currentTime += 0.1;
      sound.playSound("cardPlay", details);
    }
    for (const sourceLevel of [3, 5]) {
      ctx.currentTime += 0.1;
      sound.playSound("digivolve", { sourceLevel, targetLevel: 6 });
    }
    expect(new Set(ctx.sources.map((n) => n.start.mock.calls[0]![1])).size).toBe(5);
    expect(ctx.sources.every((n) => n.buffer === ctx.sources[0]!.buffer)).toBe(true);
  });
  it("mutes SFX independently, loops one music buffer and fades stopped music without reviving it", async () => {
    sound.startMusic();
    const ctx = await ready();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources.every((n) => n.loop)).toBe(true);
    sound.setSoundEnabled(false);
    expect(ctx.gains[0]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.025);
    sound.playSound("cardPlay");
    expect(ctx.sources).toHaveLength(1);
    expect(sound.isMusicEnabled()).toBe(true);
    sound.setMusicVolume(0.45);
    expect(ctx.gains[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.45, 1, 0.025);
    sound.setMusicEnabled(false);
    expect(ctx.sources[0]!.stop).toHaveBeenCalledWith(1.12);
    expect(ctx.gains[2]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0, 1, 0.02);
    sound.setMusicEnabled(true);
    expect(ctx.sources).toHaveLength(2);
    sound.setMusicEnabled(false);
    expect(ctx.sources[0]!.stop).toHaveBeenLastCalledWith();
    expect(localStorage.getItem("aegis.music.enabled")).toBe("false");
    sound.setSoundVolume(NaN);
    sound.setMusicVolume(Infinity);
    expect(sound.getSoundVolume()).toBe(0);
    expect(sound.getMusicVolume()).toBe(0);
  });
  it("swaps the looping score for the chosen track and remembers it", async () => {
    sound.startMusic();
    const ctx = await ready();
    expect(ctx.sources).toHaveLength(1);
    sound.setMusicTrack("warmDrive");
    expect(ctx.sources[0]!.stop).toHaveBeenCalledWith(1.12);
    await sound.prepareAudio();
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources[1]!.loop).toBe(true);
    expect(ctx.sources[1]!.start).toHaveBeenCalledWith(1.02, 0);
    expect(fetch).toHaveBeenCalledWith(MUSIC_TRACK_URLS.warmDrive);
    expect(sound.getMusicTrack()).toBe("warmDrive");
    expect(localStorage.getItem("aegis.music.track")).toBe("warmDrive");
    sound.setMusicTrack("warmDrive");
    expect(ctx.sources).toHaveLength(2);
  });
  it("keeps one steady score at the persisted volume and resumes phase using actual decoded duration", async () => {
    sound.startMusic();
    const ctx = await ready();
    expect(ctx.sources[0]!.start).toHaveBeenCalledWith(1.02, 0);
    expect(ctx.gains[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.25, 1, 0.025);
    sound.setMusicEnabled(false);
    ctx.currentTime = 35;
    sound.setMusicEnabled(true);
    expect(ctx.sources.at(-1)!.start).toHaveBeenCalledWith(35.02, 10);
    expect(ctx.sources.at(-1)!.loop).toBe(true);
    expect(ctx.gains[1]!.gain.setTargetAtTime).toHaveBeenLastCalledWith(0.25, 35, 0.025);
  });
  it("suspends when hidden, stops effect tails and tears down every context/listener", async () => {
    const cleanup = sound.installAudioLifecycle();
    sound.startMusic();
    const ctx = await ready();
    sound.playSound("effectFocus");
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    document.dispatchEvent(new Event("visibilitychange"));
    expect(ctx.suspend).toHaveBeenCalledOnce();
    cleanup();
    expect(ctx.close).toHaveBeenCalledOnce();
    for (const node of ctx.sources) expect(node.stop).toHaveBeenCalled();
    document.dispatchEvent(new Event("visibilitychange"));
    expect(ctx.suspend).toHaveBeenCalledOnce();
  });
  it("restores match music after bfcache only on a fresh gesture and rejects stale decode completion", async () => {
    const cleanup = sound.installAudioLifecycle();
    sound.startMusic();
    const old = await ready();
    window.dispatchEvent(new Event("pagehide"));
    expect(old.state).toBe("closed");
    window.dispatchEvent(new Event("pageshow"));
    expect(Context.instances).toHaveLength(1);
    const ctx = await ready();
    expect(ctx.sources).toHaveLength(1);
    expect(ctx.sources.every((n) => n.loop)).toBe(true);
    cleanup();
    sound.startMusic();
    sound.unlockAudio();
    const pending = Context.instances.at(-1)!;
    const releases: Array<(value: { duration: number }) => void> = [];
    pending.decodeAudioData.mockImplementation(
      () =>
        new Promise((done) => {
          releases.push(done);
        }),
    );
    const preparation = sound.prepareAudio();
    await vi.waitFor(() => expect(pending.decodeAudioData).toHaveBeenCalledTimes(2));
    sound.disposeAudio();
    sound.startMusic();
    const fresh = await ready();
    releases.forEach((release) => release({ duration: 24 }));
    await preparation;
    // A disposed generation must not start music or resurrect effects in its context.
    expect(pending.sources).toHaveLength(0);
    expect(fresh.sources).toHaveLength(1);
  });
  it("keeps prepared effects available when music download fails and retries only unavailable assets", async () => {
    vi.resetModules();
    const isolated = await import("./sound");
    const loader = vi.fn<(url: string) => Promise<{ ok: boolean; arrayBuffer: () => Promise<ArrayBuffer> }>>(
      async (url: string) => {
        if (url.includes("music")) throw new Error("offline music");
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
      },
    );
    vi.stubGlobal("fetch", loader);
    try {
      await isolated.prepareAudio();
      isolated.startMusic();
      isolated.unlockAudio();
      await isolated.prepareAudio();
      const ctx = Context.instances.at(-1)!;
      isolated.playSound("draw");
      expect(ctx.sources).toHaveLength(1);
      expect(ctx.sources[0]!.loop).toBe(false);
      loader.mockImplementation(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }));
      await isolated.prepareAudio();
      expect(ctx.sources).toHaveLength(2);
      expect(ctx.sources[1]!.loop).toBe(true);
      expect(loader.mock.calls.filter(([url]) => url.includes("cues"))).toHaveLength(1);
    } finally {
      isolated.disposeAudio();
    }
  });
  it("silently skips unready cues, retries failed decode and tolerates denied or unsupported audio", async () => {
    sound.unlockAudio();
    const ctx = Context.instances[0]!;
    ctx.decodeAudioData.mockRejectedValue(new Error("unsupported format"));
    sound.playSound("draw");
    await sound.prepareAudio();
    expect(ctx.sources).toHaveLength(0);
    ctx.decodeAudioData.mockResolvedValue({ duration: 24 });
    await sound.prepareAudio();
    sound.playSound("draw");
    expect(ctx.sources).toHaveLength(1);
    sound.disposeAudio();
    vi.stubGlobal("AudioContext", undefined);
    sound.unlockAudio();
    sound.playSound("cardPlay");
    expect(Context.instances).toHaveLength(1);
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
