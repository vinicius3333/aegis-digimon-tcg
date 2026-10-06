import type { Page } from "@playwright/test";

export interface AudioSmoke {
  contexts: { state: AudioContextState; effectsGain: number; musicGain: number }[];
  voices: {
    at: number;
    scheduledAt: number;
    offset: number;
    duration?: number;
    bufferDuration: number;
    sampleRate: number;
    channels: number;
    loop: boolean;
    playbackRate: number;
    bus: "effects" | "music" | "modulation";
    showcase?: { cardId: string; key: string };
    endedAt?: number;
  }[];
  peakEffects: number;
}

/** Observe actual decoded-buffer playback without replacing audio or adding a frame sampler. */
export async function installAudioCapture(page: Page): Promise<void> {
  await page.addInitScript(() => {
    for (const [key, value] of Object.entries({
      "aegis.sound.enabled": "true",
      "aegis.sound.volume": "0.7",
      "aegis.music.enabled": "true",
      "aegis.music.volume": "0.25",
    })) {
      if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
    }
    const NativeContext = window.AudioContext;
    const voices: AudioSmoke["voices"] = [];
    const contexts: { context: AudioContext; gains: GainNode[] }[] = [];
    const connections = new WeakMap<AudioNode, AudioNode | AudioParam>();
    let peakEffects = 0;
    function observeConnection(node: AudioNode): void {
      const connect = node.connect.bind(node);
      node.connect = function (target: AudioNode | AudioParam, output: number = 0, input: number = 0) {
        connections.set(node, target);
        if (target instanceof AudioNode) return connect(target, output, input);
        connect(target, output);
      } as AudioNode["connect"];
    }
    class ObservedContext extends NativeContext {
      readonly observedGains: GainNode[] = [];
      constructor(options?: AudioContextOptions) {
        super(options);
        contexts.push({ context: this, gains: this.observedGains });
      }
      override createGain(): GainNode {
        const node = super.createGain();
        this.observedGains.push(node);
        observeConnection(node);
        return node;
      }
      override createBufferSource(): AudioBufferSourceNode {
        const node = super.createBufferSource();
        observeConnection(node);
        const start = node.start.bind(node);
        node.start = (when = 0, offset = 0, duration) => {
          const at = performance.now();
          let target: AudioNode | AudioParam | undefined = node;
          let bus: AudioSmoke["voices"][number]["bus"] = "modulation";
          for (let depth = 0; target instanceof AudioNode && depth < 8; depth++) {
            if (target === this.observedGains[0]) {
              bus = "effects";
              break;
            }
            if (target === this.observedGains[1]) {
              bus = "music";
              break;
            }
            target = connections.get(target);
          }
          const voice: AudioSmoke["voices"][number] = {
            at,
            scheduledAt: at + Math.max(0, when - this.currentTime) * 1000,
            offset,
            duration,
            bufferDuration: node.buffer?.duration ?? 0,
            sampleRate: node.buffer?.sampleRate ?? 0,
            channels: node.buffer?.numberOfChannels ?? 0,
            loop: node.loop,
            playbackRate: node.playbackRate.value,
            bus,
          };
          if (bus === "effects") {
            const showcase = document.querySelector<HTMLElement>('[data-testid="zone-showcase"]');
            if (showcase?.dataset.cardId && showcase.dataset.showcaseKey)
              voice.showcase = { cardId: showcase.dataset.cardId, key: showcase.dataset.showcaseKey };
          }
          voices.push(voice);
          node.addEventListener(
            "ended",
            () => {
              voice.endedAt = performance.now();
            },
            { once: true },
          );
          peakEffects = Math.max(
            peakEffects,
            voices.filter((item) => item.bus === "effects" && item.endedAt === undefined).length,
          );
          if (duration === undefined) start(when, offset);
          else start(when, offset, duration);
        };
        return node;
      }
    }
    window.AudioContext = ObservedContext;
    (window as unknown as { audioSmoke: () => AudioSmoke }).audioSmoke = () => ({
      contexts: contexts.map(({ context, gains }) => ({
        state: context.state,
        effectsGain: gains[0]?.gain.value ?? 0,
        musicGain: gains[1]?.gain.value ?? 0,
      })),
      voices,
      peakEffects,
    });
  });
}

export async function readAudioCapture(page: Page): Promise<AudioSmoke> {
  return page.evaluate(() => (window as unknown as { audioSmoke: () => AudioSmoke }).audioSmoke());
}
