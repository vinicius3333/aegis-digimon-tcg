import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const require = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const origin = process.argv[2] ?? "http://127.0.0.1:4188";
const output = path.resolve(process.argv[3] ?? "/tmp/aegis-original-audio/browser");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.tracing.start({ screenshots: true, snapshots: true });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem("aegis.locale", "en");
  const Native = window.AudioContext;
  window.audioProof = { contexts: [], oscillators: 0, gains: [], warmMs: [], analyser: null };
  window.AudioContext = class extends Native {
    constructor(...args) {
      const start = performance.now();
      super(...args);
      window.audioProof.warmMs.push(performance.now() - start);
      window.audioProof.contexts.push(this);
    }
    createOscillator() {
      window.audioProof.oscillators++;
      return super.createOscillator();
    }
    createGain() {
      const gain = super.createGain();
      window.audioProof.gains.push(gain);
      return gain;
    }
    createDynamicsCompressor() {
      const node = super.createDynamicsCompressor();
      window.audioProof.analyser = super.createAnalyser();
      node.connect(window.audioProof.analyser);
      return node;
    }
  };
  window.audioRms = () => {
    if (!window.audioProof.analyser) return 0;
    const data = new Float32Array(2048);
    window.audioProof.analyser.getFloatTimeDomainData(data);
    return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
  };
});
try {
  await page.goto(`${origin}/settings`);
  const effects = page.getByRole("switch", { name: /Sound effects/ });
  const music = page.getByRole("switch", { name: /Background ambience/ });
  await expect(effects).toBeVisible();
  await expect(music).toBeVisible();
  expect(await page.evaluate(() => window.audioProof.contexts.length)).toBe(0);
  await effects.click();
  await page.waitForFunction(() => window.audioProof.contexts[0]?.state === "running");
  expect(await page.evaluate(() => window.audioProof.contexts.length)).toBe(1);
  await expect(page.getByRole("slider", { name: "Volume", exact: true })).toBeDisabled();
  await expect(page.getByRole("slider", { name: "Music volume", exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const sound = await import("/src/design/sound.ts");
    sound.startMusic();
  });
  await page.waitForFunction(() => window.audioRms() > 0.001);
  const musicRms = await page.evaluate(() => window.audioRms());
  const beforeMutedCue = await page.evaluate(() => window.audioProof.oscillators);
  await page.evaluate(async () => (await import("/src/design/sound.ts")).playSound("cardPlay", { cost: 14 }));
  expect(await page.evaluate(() => window.audioProof.oscillators)).toBe(beforeMutedCue);
  await music.click();
  await page.waitForFunction(() => window.audioRms() < 0.00001);
  await effects.click();
  await page.evaluate(async () =>
    (await import("/src/design/sound.ts")).playSound("cardPlay", { cost: 14, assembly: true }),
  );
  await page.waitForFunction(() => window.audioRms() > 0.005);
  const effectsRms = await page.evaluate(() => window.audioRms());
  await page.getByRole("slider", { name: "Music volume", exact: true }).evaluate((input) => {
    input.value = "40";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.screenshot({ path: path.join(output, "independent-controls.png"), fullPage: true });
  const proof = await page.evaluate(async () => {
    const sound = await import("/src/design/sound.ts");
    sound.setMusicVolume(0.4);
    sound.setMusicEnabled(true);
    sound.startMusic();
    const ctx = window.audioProof.contexts[0];
    const before = window.audioProof.oscillators;
    sound.disposeAudio();
    await new Promise((resolve) => setTimeout(resolve, 0));
    return {
      contextCount: window.audioProof.contexts.length,
      stateAfterDispose: ctx.state,
      oscillatorCount: before,
      warmMs: window.audioProof.warmMs,
      musicVolumeStored: localStorage.getItem("aegis.music.volume"),
      soundEnabledStored: localStorage.getItem("aegis.sound.enabled"),
    };
  });
  expect(proof.stateAfterDispose).toBe("closed");
  expect(proof.musicVolumeStored).toBe("0.4");
  expect(errors).toEqual([]);
  const result = {
    ...proof,
    musicRms,
    effectsRms,
    pageErrors: errors,
    checks: [
      "no-autoplay-context",
      "trusted-input-unlock",
      "independent-controls",
      "muted-effects-no-voices",
      "audible-original-ambience",
      "audible-assembly-play",
      "music-mute-silent",
      "teardown-context-closed",
    ],
  };
  await writeFile(path.join(output, "verification.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} finally {
  await context.tracing.stop({ path: path.join(output, "trace.zip") });
  await browser.close();
}
