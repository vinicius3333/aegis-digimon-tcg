#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = path.join(
  fileURLToPath(new URL("../../", import.meta.url)),
  ".local/motion-reference/aegis-hand-sources",
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const cases = [320, 768, 1024, 1440].flatMap((width) =>
  ["first", "last"].map((position) => ({ width, position, speed: "normal" })),
);
cases.push(...[320, 1440].map((width) => ({ width, position: "last", speed: "fast" })));
try {
  for (const { width, position, speed } of cases) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript((setting) => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.effect-speed", setting);
      }, speed);
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".game-hand-card img")].every((image) => image.complete && image.naturalWidth),
      );
      await page.evaluate((target) => {
        const row = document.querySelector('[data-testid="hand"]');
        // Begin with the opposite end in view, exercising source reveal on a scrolled hand.
        row.scrollLeft = target === "first" ? row.scrollWidth : 0;
        const slots = [...row.querySelectorAll("[data-hand-instance-id]")];
        const sourceSlot = target === "first" ? slots[0] : slots.at(-1);
        const counters = document.querySelector(".game-player-dock .game-arena-counters");
        const capture = (window.aegisHandSourceCapture = {
          before: {
            row: row.getBoundingClientRect().toJSON(),
            counters: counters.getBoundingClientRect().toJSON(),
            counts: counters.textContent,
            order: slots.map((slot) => slot.dataset.handInstanceId),
            sizes: slots.map((slot) => ({
              width: getComputedStyle(slot.firstElementChild).width,
              height: getComputedStyle(slot.firstElementChild).height,
            })),
            instanceId: sourceSlot.dataset.handInstanceId,
            cardId: sourceSlot.dataset.handCardId,
            src: sourceSlot.querySelector("img").currentSrc,
          },
          samples: [],
          complete: false,
        });
        let focus;
        function sample() {
          focus ??= document.querySelector(".game-hand-source-focus");
          if (focus && !focus.isConnected) {
            capture.complete = true;
            capture.restoredOpacity = getComputedStyle(sourceSlot.firstElementChild).opacity;
            capture.restoredVisibility = getComputedStyle(sourceSlot.firstElementChild).visibility;
            capture.remaining = document.querySelectorAll(".game-hand-source-focus").length;
            return;
          }
          if (focus) {
            const anchor = focus.querySelector(".game-hand-source-focus__anchor");
            const scale = focus.querySelector(".game-hand-source-focus__scale");
            const pivot = focus.querySelector(".game-hand-source-focus__pivot");
            const animation = scale.getAnimations().find((entry) => entry.animationName === "battle-hand-focus-scale");
            const image = pivot.querySelector("img");
            const anchorRect = anchor.getBoundingClientRect();
            const safeX = parseFloat(getComputedStyle(anchor).translate) || 0;
            capture.samples.push({
              time: animation?.currentTime,
              duration: animation?.effect.getComputedTiming().duration,
              scale: getComputedStyle(scale).transform,
              pivot: getComputedStyle(pivot).transform,
              safeX,
              targetSafeX: parseFloat(anchor.style.getPropertyValue("--hand-focus-safe-x")),
              centerX: anchorRect.x - safeX + anchorRect.width / 2,
              centerY: anchorRect.y + anchorRect.height / 2,
              width: anchorRect.width,
              height: anchorRect.height,
              angle: parseFloat(anchor.style.getPropertyValue("--hand-focus-angle")),
              face: pivot.getBoundingClientRect().toJSON(),
              row: row.getBoundingClientRect().toJSON(),
              counters: counters.getBoundingClientRect().toJSON(),
              counts: counters.textContent,
              order: slots.map((slot) => slot.dataset.handInstanceId),
              sizes: slots.map((slot) => ({
                width: getComputedStyle(slot.firstElementChild).width,
                height: getComputedStyle(slot.firstElementChild).height,
              })),
              originalOpacity: getComputedStyle(sourceSlot.firstElementChild).opacity,
              originalVisibility: getComputedStyle(sourceSlot.firstElementChild).visibility,
              originalAnimations: sourceSlot.getAnimations().map((entry) => entry.animationName),
              cardId: focus.dataset.cardId,
              instanceId: focus.dataset.instanceId,
              linked: focus.dataset.linked === "true",
              decoded: !!image?.complete && image.naturalWidth > 0,
              src: image?.currentSrc,
              ariaHidden: focus.getAttribute("aria-hidden"),
              pointerEvents: getComputedStyle(focus).pointerEvents,
              overflow: document.documentElement.scrollWidth > innerWidth,
            });
          }
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, position);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page.getByRole("menuitem", { name: `Preview hand source: ${position} card`, exact: true }).click();
      const duration = speed === "normal" ? 500 : 275;
      await page.waitForFunction(
        (end) => window.aegisHandSourceCapture.samples.some((sample) => sample.decoded && sample.time >= end / 2),
        duration,
      );
      await page.screenshot({ path: path.join(output, `${width}-${position}-${speed}.png`) });
      await page.waitForFunction(() => window.aegisHandSourceCapture.complete, undefined, { timeout: 20000 });
      const capture = await page.evaluate(() => window.aegisHandSourceCapture);
      await writeFile(path.join(output, `${width}-${position}-${speed}.json`), JSON.stringify(capture, null, 2));
      if (
        errors.length ||
        capture.remaining ||
        capture.restoredOpacity !== "1" ||
        capture.restoredVisibility !== "visible"
      )
        throw new Error(`${width}px ${position}: cleanup failed ${errors.join("; ")}`);
      const q = (t) => 1 - (1 - Math.max(0, Math.min(1, t))) ** 2;
      for (const sample of capture.samples) {
        if (
          sample.cardId !== capture.before.cardId ||
          sample.instanceId !== capture.before.instanceId ||
          sample.src !== capture.before.src ||
          sample.originalVisibility !== "hidden" ||
          sample.originalAnimations.includes("battle-effect-hand-rise") ||
          sample.overflow ||
          sample.ariaHidden !== "true" ||
          sample.pointerEvents !== "none" ||
          sample.duration !== duration ||
          sample.counts !== capture.before.counts ||
          JSON.stringify(sample.order) !== JSON.stringify(capture.before.order) ||
          JSON.stringify(sample.sizes) !== JSON.stringify(capture.before.sizes)
        )
          throw new Error(`${width}px ${position}: source identity/layout/motion contract failed`);
        for (const box of ["row", "counters"])
          for (const property of ["x", "y", "width", "height"])
            if (Math.abs(sample[box][property] - capture.before[box][property]) > 0.01)
              throw new Error(`${width}px ${position}: ${box} moved ${property}`);
        const factor = speed === "normal" ? 1 : 0.55;
        const t = sample.time / factor;
        const scale = 1 + 0.3 * q(t / 250);
        const pivot = q(t / 120);
        const angle = (sample.angle * Math.PI) / 180;
        const localY = -0.42 * sample.height * scale * pivot;
        const cx = sample.centerX - Math.sin(angle) * localY + sample.targetSafeX * pivot;
        const cy = sample.centerY + Math.cos(angle) * localY;
        const fw = scale * (Math.abs(Math.cos(angle)) * sample.width + Math.abs(Math.sin(angle)) * sample.height);
        const fh = scale * (Math.abs(Math.sin(angle)) * sample.width + Math.abs(Math.cos(angle)) * sample.height);
        if (
          Math.abs(sample.face.x + sample.face.width / 2 - cx) > 0.003 ||
          Math.abs(sample.face.y + sample.face.height / 2 - cy) > 0.003 ||
          Math.abs(sample.face.width - fw) > 0.003 ||
          Math.abs(sample.face.height - fh) > 0.003
        )
          throw new Error(`${width}px ${position}: composed pivot/scale/fan curve diverged at ${t}ms`);
        if (sample.face.left < 4 || sample.face.right > width - 4)
          throw new Error(`${width}px ${position}: focused face clipped at viewport`);
      }
      if (
        !capture.samples.some((sample) => sample.time > duration / 2 && sample.time < duration) ||
        !capture.samples.some((sample) => sample.linked && sample.time === duration)
      )
        throw new Error(`${width}px ${position}: hold or reading handoff missing`);
      results.push({ width, position, speed, samples: capture.samples.length, completedClock: duration });
      console.log(`${width}px ${position} ${speed}: composed hand focus, static slots, reading and cleanup passed`);
    } finally {
      await page.close();
    }
  }
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        results,
        note: "Accepted development fixtures through the real Arena renderer, including scrolled/edge hand sources. This checks the authored local pivot/scale hypothesis adapted to our fan and viewport, not primary-video camera or GridLayoutGroup runtime parity, opponent hidden-hand disclosure or printed-card legality.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
