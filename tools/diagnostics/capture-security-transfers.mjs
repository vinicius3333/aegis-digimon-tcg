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
    resolved: { type: "boolean", default: false },
  },
});
const root = fileURLToPath(new URL("../../", import.meta.url));
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1280, height: 800 },
    { name: "phone", width: 390, height: 844 },
    { name: "small-phone", width: 320, height: 900 },
    { name: "tablet", width: 768, height: 900 },
    { name: "wide", width: 1440, height: 900 },
    { name: "landscape", width: 844, height: 390 },
  ]) {
    const recorded = ["desktop", "phone"].includes(viewport.name);
    const id = `aegis-security-transfers-${values.resolved ? "resolved-" : ""}${viewport.name}`;
    const output = path.join(root, ".local/motion-reference", id);
    await mkdir(output, { recursive: true });
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      ...(recorded ? { recordVideo: { dir: output, size: { width: viewport.width, height: viewport.height } } } : {}),
    });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate((resolved) => {
        const capture = (window.aegisTransferCapture = {
          before: [],
          samples: [],
          timeline: [],
          complete: false,
          sequenceComplete: false,
          gapFrames: 0,
        });
        let onset;
        function sample(now) {
          const stage = document.querySelector(".battle-clash");
          const source = stage?.querySelector('[data-role="revealed"] .battle-clash__art');
          const dock = document.querySelector('.battle-security-branch[data-transfer="ready"]');
          const art = dock?.querySelector(".battle-security-branch__art");
          if (onset !== undefined && resolved) {
            const labels = [
              ...document.querySelectorAll(
                '.match-notice[data-variant="effect"] .match-notice__label, .narration-peek[data-tone="effect"] .narration-peek__label',
              ),
            ].map((label) => label.textContent.trim().toLowerCase());
            capture.timeline.push({
              elapsedMs: now - onset,
              sourceNotice: labels.some((label) => label.includes("security")),
              onPlayNotice: labels.some((label) => label.includes("on play")),
              showcase: document.querySelector('[data-testid="zone-showcase"]')?.dataset.cardId,
              landed: !!document.querySelector('[data-testid="confirmed-play-landing"][data-card-id="BT10-087"]'),
              dockState: dock?.dataset.state,
              dockPresent: !!dock,
            });
            const onPlay = capture.timeline.find((entry) => entry.onPlayNotice);
            if (onPlay && now - onset > onPlay.elapsedMs + 300) {
              capture.sequenceComplete = true;
              return;
            }
          }
          if (!art && source && getComputedStyle(source).visibility !== "hidden") {
            capture.before.push({
              time: now,
              box: source.getBoundingClientRect().toJSON(),
              white: getComputedStyle(source, "::after").opacity,
            });
          }
          if (
            !art &&
            onset === undefined &&
            capture.before.at(-1)?.white === "0" &&
            (!source || getComputedStyle(source).visibility === "hidden")
          )
            capture.gapFrames += 1;
          if (art && !capture.complete) {
            onset ??= now;
            const style = getComputedStyle(art);
            const matrix = new DOMMatrix(style.transform);
            const box = art.getBoundingClientRect();
            const width = parseFloat(style.width);
            const height = parseFloat(style.height);
            const animation = art
              .getAnimations()
              .find((item) => item.animationName === "battle-security-dock-transfer");
            const ancestor = getComputedStyle(dock);
            capture.samples.push({
              elapsedMs: now - onset,
              time: now,
              clockMs: animation?.currentTime,
              durationMs: animation?.effect.getComputedTiming().duration,
              x: matrix.e,
              y: matrix.f,
              scaleX: matrix.a,
              scaleY: matrix.d,
              box: box.toJSON(),
              resting: {
                x: box.x + box.width / 2 - matrix.e - width / 2,
                y: box.y + box.height / 2 - matrix.f - height / 2,
                width,
                height,
              },
              fromX: parseFloat(ancestor.getPropertyValue("--security-dock-x")),
              fromY: parseFloat(ancestor.getPropertyValue("--security-dock-y")),
              fromScaleX: parseFloat(ancestor.getPropertyValue("--security-dock-scale-x")),
              fromScaleY: parseFloat(ancestor.getPropertyValue("--security-dock-scale-y")),
              sourceHidden: !source || getComputedStyle(source).visibility === "hidden",
              stagePresent: !!stage,
              stageKey: stage?.dataset.sceneKey,
              stageOpacity: stage ? getComputedStyle(stage).opacity : null,
              stageCard: source?.querySelector("img")?.alt,
              dockState: dock.dataset.state,
              artOpacity: style.opacity,
              dockOpacity: ancestor.opacity,
              captionOpacity: getComputedStyle(dock.querySelector("figcaption")).opacity,
              overflow: document.documentElement.scrollWidth > innerWidth,
            });
            if (now - onset > 450) {
              capture.complete = true;
              if (!resolved) return;
            }
          }
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, values.resolved);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      const menu = values.resolved ? "Play resolved security-effect scenario" : "Play security-effect scenario";
      await page.getByRole("menuitem", { name: menu, exact: true }).click();
      await page.waitForFunction(() => window.aegisTransferCapture.complete, undefined, { timeout: 30000 });
      const capture = await page.evaluate(() => window.aegisTransferCapture);
      await writeFile(path.join(output, "capture.json"), JSON.stringify({ viewport, ...capture }, null, 2) + "\n");
      const moving = capture.samples.filter((sample) => sample.clockMs < sample.durationMs);
      if (capture.gapFrames || moving.length < 5 || !moving.every((sample) => sample.durationMs === 120))
        throw new Error(`${viewport.name}: insufficient painted 120 ms transfer`);
      const predecessor = capture.before.at(-1);
      const first = capture.samples[0];
      const start = {
        x: first.resting.x + first.resting.width / 2 + first.fromX - (first.resting.width * first.fromScaleX) / 2,
        y: first.resting.y + first.resting.height / 2 + first.fromY - (first.resting.height * first.fromScaleY) / 2,
        width: first.resting.width * first.fromScaleX,
        height: first.resting.height * first.fromScaleY,
      };
      if (
        !predecessor ||
        predecessor.white !== "0" ||
        Object.keys(start).some((key) => Math.abs(start[key] - predecessor.box[key]) > 1)
      )
        throw new Error(`${viewport.name}: dock does not start at the painted reveal`);
      for (const sample of moving) {
        if (sample.captionOpacity !== "0") throw new Error(`${viewport.name}: dock caption appeared before arrival`);
        const progress = sample.clockMs / 120;
        const remaining = (1 - progress) ** 2;
        const expected = {
          x: sample.fromX * remaining,
          y: sample.fromY * remaining,
          scaleX: 1 + (sample.fromScaleX - 1) * remaining,
          scaleY: 1 + (sample.fromScaleY - 1) * remaining,
        };
        if (
          Object.keys(expected).some(
            (key) => Math.abs(sample[key] - expected[key]) > (key.startsWith("scale") ? 0.001 : 0.1),
          )
        )
          throw new Error(`${viewport.name}: transfer differs from the quadratic trajectory`);
      }
      if (
        capture.samples.some(
          (sample) =>
            !sample.sourceHidden || sample.artOpacity !== "1" || sample.dockOpacity !== "1" || sample.overflow,
        )
      )
        throw new Error(`${viewport.name}: duplicate or fading art, or page overflow`);
      const settled = capture.samples.filter((sample) => sample.elapsedMs > 150);
      if (
        settled.some(
          (sample) =>
            sample.x !== 0 ||
            sample.y !== 0 ||
            sample.scaleX !== 1 ||
            sample.scaleY !== 1 ||
            sample.captionOpacity !== "1" ||
            sample.stagePresent,
        )
      )
        throw new Error(`${viewport.name}: dock or stage failed to settle`);
      await page.screenshot({ path: path.join(output, "settled.png") });
      if (values.resolved) {
        try {
          await page.waitForFunction(() => window.aegisTransferCapture.sequenceComplete, undefined, { timeout: 30000 });
        } finally {
          const timeline = await page.evaluate(() => window.aegisTransferCapture);
          await writeFile(path.join(output, "capture.json"), JSON.stringify({ viewport, ...timeline }, null, 2) + "\n");
        }
        const complete = await page.evaluate(() => window.aegisTransferCapture);
        const source = complete.timeline.find((sample) => sample.sourceNotice);
        const arrived = complete.timeline.find((sample) => sample.showcase === "BT10-087");
        const landed = complete.timeline.find((sample) => sample.landed);
        const onPlay = complete.timeline.find((sample) => sample.onPlayNotice);
        const closed = complete.timeline.find((sample) => !sample.dockPresent);
        const sourceOccurrences = complete.timeline.filter(
          (sample, index, samples) => sample.sourceNotice && !samples[index - 1]?.sourceNotice,
        ).length;
        if (
          !source ||
          !arrived ||
          !landed ||
          !onPlay ||
          !closed ||
          source.elapsedMs < 100 ||
          arrived.elapsedMs - source.elapsedMs < 1550 ||
          landed.elapsedMs - arrived.elapsedMs < 520 ||
          onPlay.elapsedMs < landed.elapsedMs ||
          closed.elapsedMs < landed.elapsedMs ||
          closed.elapsedMs - landed.elapsedMs > 50 ||
          complete.timeline.some((sample) => sample.dockState === "closing") ||
          sourceOccurrences !== 1
        )
          throw new Error(`${viewport.name}: resolved security clause, arrival or On Play ran out of order`);
        await writeFile(path.join(output, "capture.json"), JSON.stringify({ viewport, ...complete }, null, 2) + "\n");
        console.log(
          JSON.stringify({
            viewport: viewport.name,
            sourceAtMs: source.elapsedMs,
            arrivalAtMs: arrived.elapsedMs,
            landedAtMs: landed.elapsedMs,
            closedAtMs: closed.elapsedMs,
            onPlayAtMs: onPlay.elapsedMs,
            sourceOccurrences,
          }),
        );
      }
      const reducedPage = values.resolved
        ? await browser.newPage({
            viewport: { width: viewport.width, height: viewport.height },
            reducedMotion: "reduce",
          })
        : page;
      if (values.resolved) {
        await reducedPage.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
        await reducedPage.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await reducedPage.getByRole("button", { name: "Demo tools", exact: true }).click();
        await reducedPage.getByRole("menuitem", { name: menu, exact: true }).click();
        await reducedPage.locator('.battle-security-branch[data-transfer="ready"]').waitFor();
      } else await page.emulateMedia({ reducedMotion: "reduce" });
      const reduced = await reducedPage.locator(".battle-security-branch").evaluate((dock) => ({
        animations: dock.getAnimations({ subtree: true }).length,
        transform: getComputedStyle(dock.querySelector(".battle-security-branch__art")).transform,
        caption: getComputedStyle(dock.querySelector("figcaption")).opacity,
      }));
      if (values.resolved) await reducedPage.close();
      if (reduced.animations || reduced.transform !== "none" || reduced.caption !== "1")
        throw new Error(`${viewport.name}: reduced motion failed to retain the static dock`);
      if (errors.length) throw new Error(errors.join("\n"));
      console.log(
        JSON.stringify({
          viewport: viewport.name,
          paintedTransferFrames: moving.length,
          samples: capture.samples.length,
          reduced,
        }),
      );
      if (recorded) {
        const video = page.video();
        await context.close();
        const input = path.join(output, "reference.webm");
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
              `Aegis · transferência da segurança · ${viewport.name}`,
            ],
            { stdio: "inherit" },
          );
          child.on("error", reject);
          child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`Preparation exited ${code}`))));
        });
        console.log(`Compare /dev/motion-reference?comparison=${id}`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
