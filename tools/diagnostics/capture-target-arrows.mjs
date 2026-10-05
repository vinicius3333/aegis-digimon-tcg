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
try {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "phone", width: 390, height: 844 },
  ]) {
    const id = `aegis-target-arrows-${viewport.name}`;
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
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.evaluate(() => document.fonts.ready);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page.getByRole("menuitem", { name: "Automatically preview keywords", exact: true }).click();
      await page.getByRole("button", { name: "Pause after this scene", exact: true }).click();
      await page.getByRole("button", { name: /1\/44 · Blocker/ }).click();
      const select = page.getByRole("combobox", { name: "Choose a keyword" });
      const measurements = [];
      for (const keyword of ["Rush", "Raid", "Blocker"]) {
        await page.evaluate((sceneKeyword) => {
          const capture = (window.aegisArrowCapture = {
            samples: [],
            complete: false,
            detached: false,
            rotationFramesBeforeArrow: 0,
          });
          let arrow;
          let onset;
          let previousBoxes;
          const sourceId = sceneKeyword === "Blocker" ? "opponent-plutomon" : "you-chronomon";
          const artOf = (permanentId) =>
            document.querySelector(`[data-id="${permanentId}"] .game-card-enter > [data-state]`);
          const rotating = (card) =>
            card
              ?.getAnimations()
              .some(
                (animation) =>
                  animation.transitionProperty === "rotate" &&
                  animation.playState !== "finished" &&
                  animation.playState !== "idle",
              );
          const sample = (now) => {
            arrow ??= document.querySelector(".game-attack-arrow--tracking");
            const source = artOf(sourceId);
            if (!arrow && rotating(source)) capture.rotationFramesBeforeArrow++;
            if (arrow) {
              onset ??= now;
              if (!arrow.isConnected) capture.detached = true;
              else {
                const clip = arrow.querySelector(".game-attack-arrow__reveal");
                const tip = arrow.querySelector(".game-attack-arrow__tip");
                const head = tip.querySelector(".game-attack-arrow__head");
                const branch = tip.parentElement.parentElement;
                const distance = parseFloat(getComputedStyle(branch).getPropertyValue("--arrow-distance"));
                const scale = new DOMMatrix(getComputedStyle(clip).transform).a;
                const translate = parseFloat(getComputedStyle(tip).translate) || 0;
                const target = new DOMPoint(distance, 0).matrixTransform(branch.getScreenCTM());
                const point = new DOMPoint(0, 0).matrixTransform(head.getScreenCTM());
                const animation = clip.getAnimations()[0];
                // Expected identities come from the scripted scenario's visible state,
                // independently of the arrow's own coordinates.
                const blocker = document.querySelector('[data-id="you-chronomon"]');
                const targetId =
                  sceneKeyword !== "Blocker"
                    ? "opponent-plutomon"
                    : blocker.dataset.suspended
                      ? "you-chronomon"
                      : "security";
                const targetElement =
                  targetId === "security" ? document.querySelector(".game-security-shield--you") : artOf(targetId);
                const sourceBox = source.getBoundingClientRect();
                const targetBox = targetElement.getBoundingClientRect();
                const dx = sourceBox.x + sourceBox.width / 2 - targetBox.x - targetBox.width / 2;
                const dy = sourceBox.y + sourceBox.height / 2 - targetBox.y - targetBox.height / 2;
                const centres = Math.hypot(dx, dy);
                const ux = dx / centres;
                const uy = dy / centres;
                const edge = Math.min(
                  ux === 0 ? Infinity : targetBox.width / 2 / Math.abs(ux),
                  uy === 0 ? Infinity : targetBox.height / 2 / Math.abs(uy),
                );
                const reach = Math.min(edge + 6, centres / 2);
                const physicalTarget = {
                  x: targetBox.x + targetBox.width / 2 + ux * reach,
                  y: targetBox.y + targetBox.height / 2 + uy * reach,
                };
                const boxes = [
                  sourceBox.x,
                  sourceBox.y,
                  sourceBox.width,
                  sourceBox.height,
                  targetBox.x,
                  targetBox.y,
                  targetBox.width,
                  targetBox.height,
                ];
                const geometrySettled =
                  previousBoxes?.every((coordinate, index) => Math.abs(coordinate - boxes[index]) < 0.05) &&
                  !rotating(source) &&
                  !rotating(targetElement);
                previousBoxes = boxes;
                capture.samples.push({
                  elapsedMs: now - onset,
                  animationMs: animation?.currentTime,
                  endTimeMs: animation?.effect.getComputedTiming().endTime,
                  scale,
                  tipProgress: 1 + translate / distance,
                  tip: { x: point.x, y: point.y },
                  target: { x: target.x, y: target.y },
                  targetId,
                  physicalTarget,
                  geometrySettled: Boolean(geometrySettled),
                  sourceRotating: Boolean(rotating(source)),
                });
              }
              if (now - onset > 2200) {
                capture.complete = true;
                return;
              }
            }
            requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }, keyword);
        const value = await select.locator("option").filter({ hasText: keyword }).getAttribute("value");
        await select.selectOption(value);
        await page.waitForFunction(() => window.aegisArrowCapture.complete, undefined, { timeout: 20000 });
        const measured = await page.evaluate(() => window.aegisArrowCapture);
        const samples = measured.samples;
        if (samples.length < 25) throw new Error(`${keyword}: insufficient frame samples`);
        for (const [label, from, to, partial] of [
          ["first extension", 15, 65, true],
          ["first hold", 90, 150, false],
          ["second extension", 160, 195, true],
          ["settled", 250, 500, false],
        ]) {
          const beat = samples.filter((sample) => sample.animationMs >= from && sample.animationMs <= to);
          if (!beat.some((sample) => (partial ? sample.scale > 0 && sample.scale < 0.95 : sample.scale > 0.999)))
            throw new Error(`${keyword}: ${label} never painted`);
        }
        if (samples.some((sample) => Math.abs(sample.scale - sample.tipProgress) > 0.025))
          throw new Error(`${keyword}: shaft and tip use different clocks`);
        const settled = samples.filter((sample) => sample.scale > 0.999 && sample.animationMs >= 310);
        if (settled.some((sample) => Math.hypot(sample.tip.x - sample.target.x, sample.tip.y - sample.target.y) > 1))
          throw new Error(`${keyword}: tip left its live destination`);
        const physical = settled.filter((sample) => sample.geometrySettled);
        if (
          physical.length < 10 ||
          physical.some(
            (sample) => Math.hypot(sample.tip.x - sample.physicalTarget.x, sample.tip.y - sample.physicalTarget.y) > 3,
          )
        )
          throw new Error(`${keyword}: tip misses the actual destination card/security edge`);
        if (samples[0].sourceRotating || measured.rotationFramesBeforeArrow === 0)
          throw new Error(`${keyword}: the arrow must follow the visible suspension`);
        if (
          keyword === "Blocker" &&
          !["security", "you-chronomon"].every((targetIdentity) =>
            physical.some((sample) => sample.targetId === targetIdentity),
          )
        )
          throw new Error(`${keyword}: the physical blocker redirect was not painted`);
        if (samples[0].endTimeMs !== 310) throw new Error(`${keyword}: unexpected sweep clock`);
        measurements.push({ keyword, ...measured });
        console.log(JSON.stringify({ viewport: viewport.name, keyword, samples: samples.length, endTimeMs: 310 }));
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
            note: "Normal-speed real Arena renderer with development event fixtures. Both sweeps and moving endpoints are sampled on the page clock; recorder timestamps are independent. This does not verify engine legality.",
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
            `Aegis · setas de ataque (${viewport.name})`,
          ],
          { stdio: "inherit" },
        );
        child.once("error", reject);
        child.once("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Importer exited ${code}`))));
      });
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
