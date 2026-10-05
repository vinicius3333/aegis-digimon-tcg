import type { Page } from "@playwright/test";

export interface AudioSmoke {
  contexts: { state: AudioContextState; effectsGain: number; musicGain: number }[];
  voices: {
    at: number;
    scheduledAt: number;
    type: OscillatorType;
    frequency: number;
    endFrequency?: number;
    durationMs?: number;
    bus: "effects" | "music" | "modulation";
    showcase?: { cardId: string; key: string };
    endedAt?: number;
  }[];
  peakEffects: number;
}

/** Observe native audio without replacing synthesis or adding a frame sampler. */
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
      override createOscillator(): OscillatorNode {
        const node = super.createOscillator();
        observeConnection(node);
        let initialFrequency: number | undefined;
        let initialTime: number | undefined;
        let endFrequency: number | undefined;
        let endTime: number | undefined;
        const setFrequency = node.frequency.setValueAtTime.bind(node.frequency);
        node.frequency.setValueAtTime = (value, when) => {
          initialFrequency ??= value;
          initialTime ??= when;
          return setFrequency(value, when);
        };
        const rampFrequency = node.frequency.exponentialRampToValueAtTime.bind(node.frequency);
        node.frequency.exponentialRampToValueAtTime = (value, when) => {
          endFrequency = value;
          endTime = when;
          return rampFrequency(value, when);
        };
        const start = node.start.bind(node);
        node.start = (when = 0) => {
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
            type: node.type,
            frequency: initialFrequency ?? node.frequency.value,
            endFrequency,
            durationMs: initialTime !== undefined && endTime !== undefined ? (endTime - initialTime) * 1000 : undefined,
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
          start(when);
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
