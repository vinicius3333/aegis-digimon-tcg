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
const output = path.join(root, ".local/motion-reference/aegis-card-reveals");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: output, size: { width: 1280, height: 800 } },
});
try {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
    { keyword: "Ascension", expected: 1 },
    { keyword: "Fortitude", expected: 1 },
    { keyword: "Partition", expected: 2 },
  ]) {
    await page.evaluate((expected) => {
      const capture = (window.aegisRevealCapture = { reveals: [], complete: false, maxSimultaneous: 0 });
      let active;
      let onset;
      let current;
      const sample = (now) => {
        const elements = document.querySelectorAll('[data-testid="zone-showcase"]');
        capture.maxSimultaneous = Math.max(capture.maxSimultaneous, elements.length);
        if (active && !active.isConnected) {
          current.detachedAtMs = now - onset;
          active = undefined;
          if (capture.reveals.length === expected) {
            capture.complete = true;
            return;
          }
        }
        active ??= elements[0];
        if (active) {
          if (!current || current.elementIndex !== capture.reveals.length || current.detachedAtMs !== undefined) {
            onset = now;
            current = { elementIndex: capture.reveals.length + 1, cardId: active.dataset.cardId, samples: [] };
            capture.reveals.push(current);
          }
          const art = active.querySelector(".battle-showcase__art");
          const face = art.querySelector("div");
          const style = getComputedStyle(art);
          current.samples.push({
            pageTimeMs: now,
            elapsedMs: now - onset,
            artBox: art.getBoundingClientRect().toJSON(),
            transform: style.transform,
            scale: style.scale,
            translate: style.translate,
            faceOpacity: Number(getComputedStyle(face).opacity),
            whiteTurnOpacity: Number(getComputedStyle(art, "::before").opacity),
            faceLightOpacity: Number(getComputedStyle(art, "::after").opacity),
            animations: active.getAnimations({ subtree: true }).map((animation) => ({
              name: animation.animationName,
              currentTime: animation.currentTime,
              endTime: animation.effect.getComputedTiming().endTime,
            })),
          });
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, scene.expected);
    const value = await select.locator("option").filter({ hasText: scene.keyword }).getAttribute("value");
    await select.selectOption(value);
    await page.waitForFunction(() => window.aegisRevealCapture.complete, undefined, { timeout: 20000 });
    const capture = await page.evaluate(() => window.aegisRevealCapture);
    if (capture.maxSimultaneous > 1) throw new Error(`${scene.keyword}: overlapping card reveals`);
    for (const reveal of capture.reveals) {
      if (reveal.samples.length < 10) throw new Error(`${scene.keyword}: insufficient frame samples`);
      const longestClock = Math.max(...reveal.samples[0].animations.map((animation) => animation.endTime));
      if (reveal.detachedAtMs + 40 < longestClock || reveal.detachedAtMs > longestClock + 50)
        throw new Error(
          `${scene.keyword}: visible lifetime drifts from its CSS clock (${reveal.detachedAtMs} vs ${longestClock})`,
        );
      if (!reveal.samples.some((sample) => sample.faceOpacity === 1))
        throw new Error(`${scene.keyword}: printed face never became visible`);
      if (!reveal.samples.some((sample) => parseFloat(sample.scale) < 0.2))
        throw new Error(`${scene.keyword}: narrow exit was never painted`);
    }
    measurements.push({ ...scene, ...capture });
    console.log(
      JSON.stringify({
        keyword: scene.keyword,
        reveals: capture.reveals.map((reveal) => ({
          cardId: reveal.cardId,
          samples: reveal.samples.length,
          durationMs: reveal.detachedAtMs,
        })),
      }),
    );
    await page.locator(".arena-visual-player__summary").click();
  }
  if (errors.length) throw new Error(errors.join("\n"));
  const video = page.video();
  await context.close();
  const input = path.join(output, "reference.webm");
  await video.saveAs(input);
  await writeFile(
    path.join(output, "capture.json"),
    JSON.stringify(
      {
        measurements,
        note: "Normal-speed real renderer with development event fixtures. Page clocks and recorder clocks differ; locate beats in decoded frames. These scenes do not verify engine rules.",
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
        "aegis-card-reveals",
        "--title",
        "Aegis · revelação e saída das cartas",
      ],
      { stdio: "inherit" },
    );
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
  });
  console.log("Compare /dev/motion-reference?comparison=aegis-card-reveals");
} finally {
  await context.close();
  await browser.close();
}
