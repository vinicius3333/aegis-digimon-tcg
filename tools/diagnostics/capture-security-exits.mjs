#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";

const requireWeb = createRequire(new URL("../../apps/web/package.json", import.meta.url));
const { chromium } = requireWeb("@playwright/test");
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    "reduced-only": { type: "boolean", default: false },
  },
});
const root = fileURLToPath(new URL("../../", import.meta.url));
const browser = await chromium.launch({ headless: true });
const scenes = [
  { name: "opponent-battle", side: "opp", battle: true, menu: "Security battle: your Digimon loses" },
  { name: "viewer-battle", side: "you", battle: true, menu: "Play notice ordering: attack → security → turn change" },
  { name: "opponent-plain", side: "opp", battle: false, menu: "Security without effect: opponent card" },
  { name: "viewer-plain", side: "you", battle: false, menu: "Security without effect: your card" },
  { name: "restored-battle", side: "opp", battle: true, restored: true, menu: "Security battle after effect" },
];

async function captureScene(page, scene, output, reduced = false) {
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((restored) => {
    const capture = (window.aegisSecurityExitCapture = { samples: [], complete: false });
    let stage, onset;
    function sample(now) {
      stage ??= document.querySelector(
        restored ? '[data-testid="security-clash"][data-revealed-ready="true"]' : '[data-testid="security-clash"]',
      );
      if (stage && !stage.isConnected) {
        capture.complete = true;
        capture.detachedAtMs = now - onset;
        return;
      }
      const card = stage?.querySelector('.battle-clash__card[data-role="revealed"]');
      const art = card?.querySelector(".battle-clash__art");
      if (art) {
        onset ??= now;
        const style = getComputedStyle(art);
        const matrix = new DOMMatrix(style.transform);
        const exit = art.getAnimations().find((item) => item.animationName === "battle-security-exit");
        const claw = card.querySelector(".game-claw");
        capture.samples.push({
          elapsedMs: now - onset,
          exiting: stage.dataset.exiting === "true",
          side: card.dataset.side,
          exitClockMs: exit?.currentTime,
          exitDurationMs: exit?.effect.getComputedTiming().duration,
          revealAnimations: art.getAnimations().filter((item) => item.animationName === "battle-security-reveal")
            .length,
          scaleX: matrix.a,
          scaleY: matrix.d,
          x: matrix.e / parseFloat(style.width),
          y: matrix.f / parseFloat(style.height),
          white: Number(getComputedStyle(art, "::after").opacity),
          whiteDisplay: getComputedStyle(art, "::after").display,
          rootOpacity: Number(getComputedStyle(stage).opacity),
          artOpacity: Number(style.opacity),
          shatter: !!card.querySelector(".battle-clash__shatter"),
          clawVisible: !!claw && getComputedStyle(claw).visibility !== "hidden",
          activeAnimations: stage
            .getAnimations({ subtree: true })
            .filter((animation) => animation.playState === "running").length,
          overflow: document.documentElement.scrollWidth > innerWidth,
        });
      }
      requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }, scene.restored === true);
  await page.getByRole("button", { name: "Demo tools", exact: true }).click();
  await page.getByRole("menuitem", { name: scene.menu, exact: true }).click();
  try {
    await page.waitForFunction(() => window.aegisSecurityExitCapture.complete, undefined, { timeout: 30000 });
    // Include the committed clear board in the recorder, which samples independently.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))),
        ),
    );
  } finally {
    await writeFile(
      path.join(output, `${scene.name}${reduced ? "-reduced" : ""}.json`),
      JSON.stringify(await page.evaluate(() => window.aegisSecurityExitCapture), null, 2) + "\n",
    );
  }
  const capture = await page.evaluate(() => window.aegisSecurityExitCapture);
  if (reduced) {
    // Reduced motion drains the skippable result/exit after the readable lead-in.
    // No intermediate exit need paint; the fully readable face is the contract.
    if (
      capture.samples.length < 20 ||
      Math.abs(capture.detachedAtMs - 853) > 50 ||
      capture.samples.some(
        (sample) =>
          sample.activeAnimations ||
          sample.whiteDisplay !== "none" ||
          sample.scaleX !== 1 ||
          sample.scaleY !== 1 ||
          sample.x ||
          sample.y ||
          sample.shatter ||
          sample.overflow ||
          sample.side !== scene.side,
      )
    )
      throw new Error(`${scene.name}: reduced motion lost the readable lead-in or resting geometry`);
    console.log(
      `${scene.name} reduced: ${capture.samples.length} static readable samples, owner ${capture.detachedAtMs.toFixed(1)} ms`,
    );
    return { ...scene, ...capture };
  }
  const exit = capture.samples.filter((sample) => sample.exiting);
  if (exit.length < 6) throw new Error(`${scene.name}: insufficient painted disposal frames`);
  const expectedStart = (scene.restored ? 0 : 853) + (scene.battle ? 350 : 0);
  if (Math.abs(exit[0].elapsedMs - expectedStart) > 40)
    throw new Error(`${scene.name}: exit started before its recognition/impact owner finished`);
  if (capture.detachedAtMs - exit[0].elapsedMs < 115 || capture.detachedAtMs - exit[0].elapsedMs > 215)
    throw new Error(`${scene.name}: unexpected disposal owner lifetime`);
  if (capture.samples.some((sample) => sample.shatter || sample.side !== scene.side || sample.overflow))
    throw new Error(`${scene.name}: wrong owner, checked-card shards or horizontal page overflow`);
  if (
    scene.restored &&
    capture.samples
      .filter((sample) => !sample.exiting)
      .some(
        (sample) =>
          sample.revealAnimations ||
          sample.whiteDisplay !== "none" ||
          sample.scaleX !== 1 ||
          sample.scaleY !== 1 ||
          sample.x ||
          sample.y,
      )
  )
    throw new Error(`${scene.name}: already revealed docked card repeated its entrance`);
  for (const sample of exit) {
    if (sample.rootOpacity !== 1 || sample.artOpacity !== 1 || sample.clawVisible)
      throw new Error(`${scene.name}: disposed card faded or kept its stationary claw`);
    const time = sample.exitClockMs;
    if (sample.exitDurationMs !== 140 || typeof time !== "number")
      throw new Error(`${scene.name}: wrong disposal animation clock`);
    const shrink = Math.min(time / 70, 1);
    const rise = Math.max(0, Math.min((time - 70) / 70, 1));
    const expectedX = 1 - 0.9 * (2 * shrink - shrink ** 2);
    const expectedY = 1 + (4 / 3) * (2 * shrink - shrink ** 2);
    const distance = scene.side === "you" ? 254 / 84 : 157 / 84;
    const expectedRise = -distance * (2 * rise - rise ** 2);
    if (
      Math.abs(sample.scaleX - expectedX) > 0.003 ||
      Math.abs(sample.scaleY - expectedY) > 0.003 ||
      Math.abs(sample.y - expectedRise) > 0.003 ||
      Math.abs(sample.x) > 0.001
    )
      throw new Error(`${scene.name}: painted disposal differs from quadratic narrowing/rise at ${time.toFixed(1)} ms`);
    if (sample.white !== (time < 35 ? 0 : 1))
      throw new Error(`${scene.name}: the outgoing artwork did not clear at 35 ms`);
  }
  if (!reduced && (!exit.some((sample) => sample.exitClockMs < 70) || !exit.some((sample) => sample.exitClockMs > 100)))
    throw new Error(`${scene.name}: one disposal half never painted`);
  if (!reduced) {
    const completed = exit.find((sample) => sample.exitClockMs >= 140);
    if (!completed || capture.detachedAtMs - completed.elapsedMs > 50)
      throw new Error(`${scene.name}: CSS disposal did not finish before prompt removal`);
  }
  console.log(
    `${scene.name}${reduced ? " reduced" : ""}: ${exit.length} disposal samples, onset ${exit[0].elapsedMs.toFixed(1)} ms, owner ${capture.detachedAtMs.toFixed(1)} ms`,
  );
  return { ...scene, ...capture };
}

try {
  for (const viewport of values["reduced-only"]
    ? []
    : [
        { name: "desktop", width: 1280, height: 800 },
        { name: "phone", width: 390, height: 844 },
      ]) {
    const id = `aegis-security-exits-${viewport.name}`;
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
      for (const scene of scenes) measurements.push(await captureScene(page, scene, output));
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
            note: "Actual Arena/GameScreen presentation fixtures. Neither printed-card engine legality nor full battle fidelity is asserted. Source and recorder have independent clocks.",
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
            `Aegis · saída da segurança · ${viewport.name}`,
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
  for (const width of [320, 768, 1024, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      const output = path.join(root, ".local/motion-reference/aegis-security-exits-reduced", String(width));
      await mkdir(output, { recursive: true });
      for (const scene of [scenes[0], scenes[3]]) await captureScene(page, scene, output, true);
      if (errors.length) throw new Error(errors.join("\n"));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
