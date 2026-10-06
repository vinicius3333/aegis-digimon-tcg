#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const root = fileURLToPath(new URL("../../", import.meta.url));
const spatial = JSON.parse(
  await readFile(new URL("../../apps/web/src/game/particleLight.json", import.meta.url), "utf8"),
).spatial;
const plane = spatial.cardPlane;
const angle = (plane.parentAngle * Math.PI) / 180;
const depth =
  (2 * plane.fall * Math.tan((spatial.fieldOfView * Math.PI) / 360) * Math.cos(angle)) / plane.referenceSize[1];
const rise = (plane.fall * Math.sin(angle)) / plane.printedWidth;
const output = path.join(root, ".local/motion-reference/aegis-hatches");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const recordings = [];

async function openFixture(page) {
  await page.goto(new URL("/dev/arena?mode=visual&scenario=hatch", values.base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  await page.evaluate(() => document.fonts.ready);
}

async function hatch(page, seat) {
  await page.getByRole("button", { name: "Demo tools", exact: true }).click();
  await page
    .getByRole("menuitem", { name: `Preview hatch: ${seat === 0 ? "your egg" : "opponent egg"}`, exact: true })
    .click();
}

try {
  for (const width of [320, 768, 1024, 1440]) {
    for (const reduced of [false, true]) {
      const recorded = !reduced && (width === 320 || width === 1440);
      const directory = path.join(output, `${width}${reduced ? "-reduced" : ""}`);
      await mkdir(directory, { recursive: true });
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        reducedMotion: reduced ? "reduce" : "no-preference",
        ...(recorded ? { recordVideo: { dir: directory, size: { width, height: 900 } } } : {}),
      });
      await context.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        for (const seat of [0, 1]) {
          await openFixture(page);
          await page.evaluate(
            ({ reduce, seat: owner }) => {
              const ownerSelector =
                owner === 0
                  ? ".game-utility-slot--you-raising .game-breeding-slot"
                  : ".game-utility-slot--opp-raising .game-breeding-slot";
              const boxes = [...document.querySelectorAll(".game-breeding-slot__box")];
              const before = boxes.map((box) => box.getBoundingClientRect().toJSON());
              window.aegisHatchCapture = { before, samples: [], complete: false };
              let slot;
              let start;
              let cleared;
              function sample(now) {
                slot ??= document.querySelector(
                  `${ownerSelector}${reduce ? ":has(.game-card-enter)" : '[data-burst="hatch"]'}`,
                );
                if (slot) {
                  start ??= now;
                  if (!slot.dataset.burst) cleared ??= now;
                  const art = slot.querySelector(".game-card-enter");
                  const style = getComputedStyle(art);
                  const burst = slot.querySelector(".battle-burst");
                  const canvas = burst?.querySelector("canvas");
                  let lightPixels = 0;
                  if (canvas && !reduce) {
                    const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
                    for (let i = 3; i < pixels.length; i += 64) if (pixels[i] > 4) lightPixels++;
                  }
                  const animation = art.getAnimations().find((entry) => entry.animationName === "battle-egg-landing");
                  const face = slot.querySelector("img");
                  window.aegisHatchCapture.samples.push({
                    elapsed: now - start,
                    cardId: slot.dataset.cardId,
                    permanentId: slot.dataset.permanentId,
                    cleared: cleared !== undefined,
                    scale: style.scale === "none" ? 1 : Number(style.scale),
                    opacity: Number(style.opacity),
                    name: style.animationName,
                    duration: animation?.effect.getComputedTiming().duration,
                    clock: animation?.currentTime,
                    box: art.getBoundingClientRect().toJSON(),
                    slotBoxes: boxes.map((box) => box.getBoundingClientRect().toJSON()),
                    overflow: document.documentElement.scrollWidth > innerWidth,
                    showcase: !!document.querySelector('[data-testid="zone-showcase"]'),
                    burstDisplay: burst ? getComputedStyle(burst).display : "absent",
                    lightPixels,
                    faceDecoded: !!face?.complete && face.naturalWidth > 0,
                  });
                  if (cleared !== undefined && now - cleared >= 400) {
                    window.aegisHatchCapture.complete = true;
                    return;
                  }
                }
                requestAnimationFrame(sample);
              }
              requestAnimationFrame(sample);
            },
            { reduce: reduced, seat },
          );
          await hatch(page, seat);
          await page.waitForFunction(() => window.aegisHatchCapture.complete, undefined, { timeout: 10000 });
          const capture = await page.evaluate(() => window.aegisHatchCapture);
          if (capture.samples.length < 20) throw new Error(`${width}px seat${seat}: insufficient normal-clock samples`);
          for (const sample of capture.samples) {
            if (sample.cardId !== (seat === 0 ? "BT26-001" : "BT24-007") || sample.permanentId !== `hatch-${seat}`)
              throw new Error(`${width}px seat${seat}: wrong egg identity or permanent owner`);
            if (sample.overflow || sample.showcase || sample.opacity !== 1)
              throw new Error(`${width}px seat${seat}: hatch overflow, central reveal or faded card`);
            sample.slotBoxes.forEach((box, index) => {
              for (const property of ["x", "y", "width", "height"])
                if (Math.abs(box[property] - capture.before[index][property]) > 0.01)
                  throw new Error(`${width}px seat${seat}: slot geometry changed`);
            });
            if (sample.cleared && (sample.name !== "none" || sample.scale !== 1))
              throw new Error(`${width}px seat${seat}: clearing the burst replayed an entrance`);
            if (
              reduced &&
              (sample.name !== "none" || sample.scale !== 1 || !["none", "absent"].includes(sample.burstDisplay))
            )
              throw new Error(`${width}px seat${seat}: reduced hatch retained decoration`);
          }
          const active = capture.samples.filter((sample) => !sample.cleared);
          if (
            !reduced &&
            (active.some((sample) => sample.duration !== 100) ||
              !active.some((sample) => sample.clock < 100) ||
              !active.some((sample) => sample.lightPixels > 0))
          )
            throw new Error(`${width}px seat${seat}: missing 100ms fall or arrival light`);
          if (!capture.samples.at(-1).faceDecoded) throw new Error(`${width}px seat${seat}: egg face did not decode`);
          const settled = capture.samples.filter((sample) => sample.cleared);
          const resting = settled[0].box;
          if (
            settled.some((sample) =>
              ["x", "y", "width", "height"].some(
                (property) => Math.abs(sample.box[property] - resting[property]) > 0.01,
              ),
            )
          )
            throw new Error(`${width}px seat${seat}: settled card changed size or position`);
          await page.screenshot({ path: path.join(directory, `seat-${seat}-settled.png`) });
          await writeFile(path.join(directory, `seat-${seat}.json`), JSON.stringify(capture, null, 2) + "\n");
          results.push({ width, reduced, seat, samples: capture.samples.length });
          console.log(`${width}px ${reduced ? "reduced" : "normal"} seat${seat}: hatch and settled geometry passed`);
        }
        if (errors.length) throw new Error(errors.join("\n"));
        if (recorded)
          recordings.push({
            video: page.video(),
            directory,
            id: width === 320 ? "aegis-hatches-phone" : "aegis-hatches-desktop",
          });
      } finally {
        await context.close();
      }
    }
  }
  // Separately seek the real CSS animation. These poses prove interpolation;
  // they are deliberately excluded from the normal-speed recordings above.
  for (const width of [320, 768, 1024, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await openFixture(page);
      await hatch(page, 0);
      await page.locator('.game-breeding-slot[data-burst="hatch"] .game-card-enter').waitFor();
      const samples = await page.evaluate(() => {
        const art = document.querySelector('.game-breeding-slot[data-burst="hatch"] .game-card-enter');
        const animation = art.getAnimations().find((entry) => entry.animationName === "battle-egg-landing");
        animation.pause();
        return [
          0,
          10,
          20,
          30,
          (100 * 4) / 11,
          45,
          (100 * 6) / 11,
          65,
          (100 * 8) / 11,
          (100 * 9) / 11,
          (100 * 10) / 11,
          (100 * 10.5) / 11,
          99,
          100,
          250,
        ].map((clock) => {
          animation.currentTime = clock;
          const style = getComputedStyle(art);
          return {
            clock,
            scale: Number(style.scale),
            opacity: Number(style.opacity),
            box: art.getBoundingClientRect().toJSON(),
            board: art.closest(".game-board").getBoundingClientRect().toJSON(),
          };
        });
      });
      const resting = samples.at(-1).box;
      for (const sample of samples) {
        const t = Math.min(1, sample.clock / 100);
        const centre = t < 4 / 11 ? 0 : t < 8 / 11 ? 6 / 11 : t < 10 / 11 ? 9 / 11 : 10.5 / 11;
        const floor = t < 4 / 11 ? 0 : t < 8 / 11 ? 0.75 : t < 10 / 11 ? 0.9375 : 0.984375;
        const progress = 7.5625 * (t - centre) ** 2 + floor;
        const expected = 1 / (1 - depth * (1 - progress));
        // CSS serializes scale with fewer digits; transformed bounds retain
        // enough precision to distinguish the small final rebound.
        const measuredScale = sample.box.width / resting.width;
        if (Math.abs(measuredScale - expected) > 0.000002 || sample.opacity !== 1)
          throw new Error(`${width}px: hatch differs from OutBounce at ${sample.clock}ms`);
        const offsetX = resting.x + resting.width / 2 - sample.board.x - sample.board.width / 2;
        const offsetY = resting.y + resting.height / 2 - sample.board.y - sample.board.height / 2;
        const shiftX = offsetX * (expected - 1);
        const shiftY = offsetY * (expected - 1) - resting.width * rise * (1 - progress) * expected;
        if (
          Math.abs(sample.box.x + sample.box.width / 2 - resting.x - resting.width / 2 - shiftX) > 0.01 ||
          Math.abs(sample.box.y + sample.box.height / 2 - resting.y - resting.height / 2 - shiftY) > 0.01
        )
          throw new Error(`${width}px: incorrect projected depth displacement`);
      }
      await writeFile(path.join(output, `${width}-curve.json`), JSON.stringify(samples, null, 2) + "\n");
      console.log(`${width}px: independently measured OutBounce interpolation passed`);
    } finally {
      await page.close();
    }
  }
  for (const { video, directory, id } of recordings) {
    const input = path.join(directory, "reference.webm");
    await video.saveAs(input);
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
          `Aegis · nascimento ${id.endsWith("phone") ? "celular" : "desktop"}`,
        ],
        { stdio: "inherit" },
      );
      child.on("error", reject);
      child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
    });
  }
  await writeFile(
    path.join(output, "summary.json"),
    JSON.stringify(
      {
        results,
        note: "Normal-speed accepted-event fixtures use the production Arena renderer and independent browser clocks. CSS curve probes seek their clock separately. This does not verify engine legality or match the reference camera projection.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
