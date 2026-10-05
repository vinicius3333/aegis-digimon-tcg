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
const browser = await chromium.launch({ headless: true });

function hermite(from, to, fromSlope, toSlope, time) {
  return (
    (2 * time ** 3 - 3 * time ** 2 + 1) * from +
    (-2 * time ** 3 + 3 * time ** 2) * to +
    (time ** 3 - 2 * time ** 2 + time) * fromSlope +
    (time ** 3 - time ** 2) * toSlope
  );
}

try {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    const id = `aegis-security-reveals-${viewport.name}`;
    const output = path.join(root, ".local/motion-reference", id);
    await mkdir(output, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      recordVideo: { dir: output, size: { width: viewport.width, height: viewport.height } },
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      const measurements = [];
      for (const scene of [
        { name: "opponent-security", side: "opp", menu: "Security battle: your Digimon loses" },
        { name: "viewer-security", side: "you", menu: "Play notice ordering: attack → security → turn change" },
        {
          name: "effect-css-variant",
          side: "opp",
          menu: "Security battle: your Digimon loses",
          cssResolution: "effect",
        },
        {
          name: "trashed-css-variant",
          side: "opp",
          menu: "Security battle: your Digimon loses",
          cssResolution: "trashed",
        },
      ]) {
        await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate((cssResolution) => {
          const capture = (window.aegisSecurityCapture = { samples: [], complete: false });
          let stage, art, onset;
          function sample(now) {
            stage ??= document.querySelector(".battle-clash");
            // Exercise the selector cascade on the same real component. These
            // marked probes verify CSS variants, not effect engine events.
            if (stage && cssResolution) {
              stage.dataset.resolution = cssResolution;
              stage.querySelector(".battle-clash__badge").textContent = `CSS variant probe · ${cssResolution}`;
            }
            if (stage && !stage.isConnected) {
              capture.complete = true;
              capture.detachedAtMs = now - onset;
              return;
            }
            art ??= stage?.querySelector('.battle-clash__card[data-role="revealed"] .battle-clash__art');
            if (art) {
              onset ??= now;
              const style = getComputedStyle(art);
              const matrix = new DOMMatrix(style.transform);
              const animation = art.getAnimations().find((item) => item.animationName === "battle-security-reveal");
              const timing = animation?.effect.getComputedTiming();
              const ray = stage.querySelector(".battle-security-reveal-light .battle-burst__rays i");
              capture.samples.push({
                pageTimeMs: now,
                elapsedMs: now - onset,
                clockMs: animation?.currentTime,
                delayMs: timing?.delay,
                durationMs: timing?.duration,
                scale: matrix.a,
                x: matrix.e / parseFloat(style.width),
                y: matrix.f / parseFloat(style.height),
                side: art.closest("figure").dataset.side,
                white: Number(getComputedStyle(art, "::after").opacity),
                opacity: Number(style.opacity),
                lightOpacity: Number(getComputedStyle(ray).opacity),
                outcomeMs: parseFloat(getComputedStyle(stage).getPropertyValue("--t-clash-outcome-at")),
                overflow: document.documentElement.scrollWidth > innerWidth,
              });
            }
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        }, scene.cssResolution);
        await page.getByRole("button", { name: "Demo tools", exact: true }).click();
        await page.getByRole("menuitem", { name: scene.menu, exact: true }).click();
        await page.waitForFunction(() => window.aegisSecurityCapture.complete, undefined, { timeout: 30000 });
        const capture = await page.evaluate(() => window.aegisSecurityCapture);
        await writeFile(path.join(output, `${scene.name}.json`), JSON.stringify(capture, null, 2) + "\n");
        const reveal = capture.samples.filter(
          (sample) => sample.clockMs >= sample.delayMs && sample.clockMs - sample.delayMs < sample.durationMs,
        );
        if (reveal.length < 8) throw new Error(`${scene.name}: insufficient painted entrance frames`);
        for (const sample of reveal) {
          const time = (sample.clockMs - sample.delayMs) / sample.durationMs;
          const half = time <= 0.5 ? time * 2 : (time - 0.5) * 2;
          const expectedScale = 1 / 12 + (11 / 12) * (3 * time ** 2 - 2 * time ** 3);
          const arc = viewport.width < 600 ? 0.3 : 5 / 6;
          const expectedX = time <= 0.5 ? hermite(0, -arc, 0, 0, half) : hermite(-arc, 0, 0, 0, half);
          const start = scene.side === "you" ? 66 / 84 : -38 / 84;
          const middle = scene.side === "you" ? 46 / 84 : -32 / 84;
          const slope = scene.side === "you" ? -33 / 84 : 12 / 84;
          const expectedY = time <= 0.5 ? hermite(start, middle, 0, slope, half) : hermite(middle, 0, slope, 0, half);
          const expectedWhite = time <= 0.5 ? hermite(1, 0.8, 0, -0.4, half) : hermite(0.8, 0, -0.4, 0, half);
          if (
            Math.abs(sample.scale - expectedScale) > 0.012 ||
            Math.abs(sample.x - expectedX) > 0.012 ||
            Math.abs(sample.y - expectedY) > 0.012 ||
            Math.abs(sample.white - expectedWhite) > 0.012
          )
            throw new Error(
              `${scene.name}: painted reveal differs from its normalized trajectory at ${(time * sample.durationMs).toFixed(1)} ms`,
            );
        }
        if (capture.samples.some((sample) => sample.side !== scene.side || sample.overflow))
          throw new Error(`${scene.name}: wrong owner or horizontal page overflow`);
        if (
          !capture.samples.some((sample) => sample.lightOpacity > 0.8) ||
          capture.samples
            .filter((sample) => sample.elapsedMs >= 650 && sample.elapsedMs < 800)
            .some((sample) => sample.lightOpacity !== 0)
        )
          throw new Error(`${scene.name}: reveal light missed its peak or continued through preparation`);
        const readable = capture.samples.filter((sample) => sample.elapsedMs >= 420 && sample.elapsedMs < 800);
        if (
          readable.length < 12 ||
          readable.some(
            (sample) =>
              Math.abs(sample.scale - 1) > 0.001 ||
              Math.abs(sample.x) > 0.001 ||
              Math.abs(sample.y) > 0.001 ||
              sample.white !== 0 ||
              sample.opacity !== 1,
          )
        )
          throw new Error(`${scene.name}: card did not hold fully readable at its original position`);
        measurements.push({ ...scene, ...capture });
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
            viewport,
            measurements,
            note: "Normalized curve checks preserve Aegis resting geometry. Recorder and page clocks differ. Owner scenes use development event fixtures; explicitly marked effect/trashed probes change only the CSS resolution selector. Neither proves engine legality or complete animation parity.",
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
            id,
            "--title",
            `Aegis · revelação de segurança · ${viewport.name}`,
          ],
          { stdio: "inherit" },
        );
        child.on("error", reject);
        child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
      });
      console.log(`Compare /dev/motion-reference?comparison=${id}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
