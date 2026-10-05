#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-particle-light/", import.meta.url);
await mkdir(output, { recursive: true });
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  const result = await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { CardBurst } = await import("/src/game/CardBurst.tsx");
    const panel = document.createElement("div");
    panel.style.cssText = "position:fixed;left:100px;top:100px;width:72px;height:101px;z-index:9999";
    document.body.append(panel);
    const root = createRoot(panel);
    root.render(React.createElement(CardBurst, { variant: "evolve", color: "Red", cueKey: 998, landing: true }));
    while (!panel.querySelector("canvas")) await new Promise(requestAnimationFrame);
    let canvas = panel.querySelector("canvas");
    const clock = panel.querySelector(".battle-burst__clock").getAnimations()[0];
    let clears = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas === canvas) clears++;
      return clear.apply(this, args);
    };
    function lit() {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.filter((_, i) => i % 4 === 3 && pixels[i] > 0).length;
    }
    await new Promise((resolve) => setTimeout(resolve, 220));
    const active = lit();
    clock.pause();
    await new Promise(requestAnimationFrame);
    const pausedClears = clears;
    await new Promise((resolve) => setTimeout(resolve, 150));
    const pausedUnchanged = clears === pausedClears;
    clock.play();
    await new Promise((resolve) => setTimeout(resolve, 1050));
    await new Promise(requestAnimationFrame);
    const finished = { state: clock.playState, age: clock.currentTime, lit: lit() };
    root.render(
      React.createElement(CardBurst, { key: 999, variant: "evolve", color: "Red", cueKey: 999, landing: true }),
    );
    const oldCanvas = canvas;
    const deadline = performance.now() + 5000;
    while (panel.querySelector("canvas") === oldCanvas) {
      if (performance.now() > deadline) throw new Error("Replacement canvas did not mount");
      await new Promise(requestAnimationFrame);
    }
    canvas = panel.querySelector("canvas");
    await new Promise((resolve) => setTimeout(resolve, 150));
    const activeBeforeUnmount = lit();
    root.unmount();
    panel.remove();
    const before = clears;
    await new Promise((resolve) => setTimeout(resolve, 80));
    const cleanup = clears === before;
    CanvasRenderingContext2D.prototype.clearRect = clear;
    return { active, pausedUnchanged, finished, activeBeforeUnmount, cleanup };
  });
  assert.ok(result.active > 0);
  assert.ok(result.pausedUnchanged);
  assert.equal(result.finished.lit, 0);
  assert.equal(result.finished.state, "finished");
  assert.ok(result.activeBeforeUnmount > 0);
  assert.ok(result.cleanup);
  const report = {
    scope:
      "Production CardBurst on synthetic72x101 host; CSS explicitly paused/resumed, never sought; no natural Arena event or camera claim.",
    result,
  };
  await writeFile(new URL("lifecycle.json", output), JSON.stringify(report, null, 2) + "\n");
  console.log("Particle lifecycle checks passed; artifact:", new URL("lifecycle.json", output).pathname);
} finally {
  await browser.close();
}
