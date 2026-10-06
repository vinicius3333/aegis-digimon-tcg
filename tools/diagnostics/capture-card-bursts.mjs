#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const root = fileURLToPath(new URL("../../", import.meta.url));
const output = path.join(root, ".local/motion-reference/aegis-card-bursts");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: output, size: { width: 1280, height: 800 } },
});
try {
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole("button", { name: "Demo tools", exact: true }).click();
  await page.getByRole("menuitem", { name: "Automatically preview keywords", exact: true }).click();
  await page.getByRole("button", { name: "Pause after this scene", exact: true }).click();
  await page.getByRole("button", { name: /1\/44 · Blocker/ }).click();
  const select = page.getByRole("combobox", { name: "Choose a keyword" });
  const measurements = [];
  for (const scene of [
    { keyword: "Ascension", variant: "evolve" },
    { keyword: "Fortitude", variant: "play" },
    { keyword: "Jamming", variant: "shatter" },
    { keyword: "Retaliation", variant: "evolve", selector: '.game-delete-burst .battle-burst[data-variant="evolve"]' },
  ]) {
    // A fresh page observer samples the real component and its CSS clocks. It
    // never pauses or changes those clocks, so the video records normal play.
    await page.evaluate(({ variant, selector }) => {
      window.aegisBurstCapture = { samples: [], complete: false };
      let target;
      let start;
      function sample(now) {
        const field = variant === "play" || variant === "evolve" ? ".game-permanent " : "";
        target ??= document.querySelector(selector ?? `${field}.battle-burst[data-variant="${variant}"]`);
        if (target && !target.isConnected) {
          window.aegisBurstCapture.complete = true;
          window.aegisBurstCapture.detachedAtMs = now - start;
          return;
        }
        if (target) {
          const animations = target.getAnimations({ subtree: true });
          if (animations.length) {
            start ??= now;
            const core = target.querySelector(".battle-burst__core");
            const ray = target.querySelector(".battle-burst__rays i");
            const canvas = target.querySelector("canvas");
            let lightPixels = 0;
            if (canvas) {
              const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
              for (let i = 3; i < pixels.length; i += 64) if (pixels[i] > 4) lightPixels++;
            }
            window.aegisBurstCapture.samples.push({
              pageTimeMs: now,
              elapsedMs: now - start,
              variant,
              box: target.getBoundingClientRect().toJSON(),
              coreOpacity: core ? Number(getComputedStyle(core).opacity) : null,
              rayOpacity: ray ? Number(getComputedStyle(ray).opacity) : null,
              lightPixels,
              emitters: canvas?.dataset.emitters,
              capacity: canvas?.dataset.capacity,
              rays: target.querySelectorAll(".battle-burst__rays i").length,
              animations: animations.map((animation) => ({
                name: animation.animationName,
                currentTime: animation.currentTime,
                endTime: animation.effect.getComputedTiming().endTime,
                progress: animation.effect.getComputedTiming().progress,
              })),
            });
          }
        }
        requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample);
    }, scene);
    const value = await select.locator("option").filter({ hasText: scene.keyword }).getAttribute("value");
    await select.selectOption(value);
    await page.waitForFunction(() => window.aegisBurstCapture.complete, undefined, { timeout: 15000 });
    const capture = await page.evaluate(() => window.aegisBurstCapture);
    if (capture.samples.length < 5) throw new Error(`${scene.keyword}: insufficient visible samples`);
    if (!capture.samples.some((sample) => sample.lightPixels > 0 || sample.rayOpacity > 0.8))
      throw new Error(`${scene.keyword}: burst never reached its bright phase`);
    const endTime = Math.max(...capture.samples[0].animations.map((animation) => animation.endTime));
    if (capture.detachedAtMs + 40 < endTime)
      throw new Error(`${scene.keyword}: light outlives its owner (${capture.detachedAtMs} < ${endTime})`);
    measurements.push({ ...scene, ...capture });
    // Re-open details after the scene selector collapses them.
    await page.locator(".arena-visual-player__summary").click();
  }
  const video = page.video();
  await context.close();
  const input = path.join(output, "reference.webm");
  await video.saveAs(input);
  await writeFile(
    path.join(output, "capture.json"),
    JSON.stringify(
      {
        viewport: { width: 1280, height: 800 },
        measurements,
        note: "Page timestamps differ from video timestamps. Locate onset in decoded frames. Scenes use the real game renderer with development event fixtures, not engine-rule verification.",
      },
      null,
      2,
    ) + "\n",
  );
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        path.join(root, "tools/diagnostics/prepare-motion-reference.mjs"),
        "--input",
        input,
        "--id",
        "aegis-card-bursts",
        "--title",
        "Aegis · chegada, evolução, segurança e deleção",
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
  });
  console.log("Compare /dev/motion-reference?comparison=aegis-card-bursts");
} finally {
  await context.close();
  await browser.close();
}
