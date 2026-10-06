#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-breeding-transfer/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 768, 1024, 1440])
    for (const side of ["your", "opponent"])
      for (const speed of ["normal", "fast"]) {
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
          await page.locator(".game-breeding-slot .game-permanent").evaluateAll(async (cards) => {
            await Promise.all(
              cards.flatMap((card) => [...card.querySelectorAll("img")].map((image) => image.decode())),
            );
            await Promise.all(
              cards.flatMap((card) =>
                card
                  .getAnimations({ subtree: true })
                  .filter((animation) => {
                    return animation.effect.getComputedTiming().iterations !== Infinity;
                  })
                  .map((animation) => animation.finished.catch(() => {})),
              ),
            );
          });
          await page.evaluate((seat) => {
            const id = seat === "your" ? "you-breeding" : "opponent-breeding";
            const source = document.querySelector(`.game-breeding-slot[data-permanent-id="${id}"] .game-permanent`);
            const capture = (window.aegisBreedingTransfer = {
              id,
              before: source.querySelector(".game-card-enter > [data-state]").getBoundingClientRect().toJSON(),
              sources: [...source.querySelectorAll("img")].map((image) => image.currentSrc),
              rows: [],
              complete: false,
            });
            let active = false;
            function sample() {
              const clone = document.querySelector(`[data-breeding-transfer="${id}"]`);
              const target = document.querySelector(`.game-battle-row .game-permanent[data-permanent-id="${id}"]`);
              if (clone) {
                active = true;
                const animation = clone.getAnimations()[0];
                capture.rows.push({
                  time: animation.currentTime,
                  duration: animation.effect.getTiming().duration,
                  rate: animation.playbackRate,
                  face: clone.querySelector(".game-card-enter > [data-state]").getBoundingClientRect().toJSON(),
                  to: target.querySelector(".game-card-enter > [data-state]").getBoundingClientRect().toJSON(),
                  targetVisibility: getComputedStyle(target).visibility,
                  sources: [...clone.querySelectorAll("img")].map((image) => image.currentSrc),
                  burst: !!target.querySelector(".battle-burst, .game-card-dust"),
                  overflow: document.documentElement.scrollWidth > innerWidth,
                  interactive: !clone.inert || clone.querySelector("[tabindex], [data-drop]"),
                });
              } else if (active) {
                capture.complete = true;
                capture.after = {
                  face: target.querySelector(".game-card-enter > [data-state]").getBoundingClientRect().toJSON(),
                  visibility: getComputedStyle(target).visibility,
                  burst: !!target.querySelector(".battle-burst, .game-card-dust"),
                  quiet: target.querySelector(".game-card-enter").classList.contains("game-card-enter--quiet"),
                  entrance: target.querySelector(".game-card-enter").getAnimations().length,
                };
                return;
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          }, side);
          await page.getByRole("button", { name: "Demo tools", exact: true }).click();
          await page.getByRole("menuitem", { name: `Move ${side} breeding card to battle`, exact: true }).click();
          await page.waitForFunction(() => window.aegisBreedingTransfer.complete);
          const capture = await page.evaluate(() => window.aegisBreedingTransfer);
          await writeFile(new URL("last-case.json", output), JSON.stringify({ width, side, speed, capture }, null, 2));
          if (
            errors.length ||
            capture.rows.length < 3 ||
            capture.after.visibility !== "visible" ||
            capture.after.burst ||
            !capture.after.quiet ||
            capture.after.entrance
          )
            throw new Error("Breeding transfer did not land quietly or raised a browser error");
          for (const row of capture.rows) {
            const progress = 1 - (1 - Math.min(1, row.time / row.duration)) ** 3;
            const from = capture.before,
              to = row.to;
            const expectedX = from.x + from.width / 2 + (to.x + to.width / 2 - from.x - from.width / 2) * progress;
            const expectedY = from.y + from.height / 2 + (to.y + to.height / 2 - from.y - from.height / 2) * progress;
            if (
              row.duration !== 200 ||
              (row.time < 200 && row.targetVisibility !== "hidden") ||
              row.burst ||
              row.overflow ||
              row.interactive ||
              JSON.stringify(row.sources) !== JSON.stringify(capture.sources) ||
              Math.abs(row.face.x + row.face.width / 2 - expectedX) > 0.1 ||
              Math.abs(row.face.y + row.face.height / 2 - expectedY) > 0.1 ||
              Math.abs(row.face.width - (from.width + (to.width - from.width) * progress)) > 0.1
            )
              throw new Error(
                "Transfer lost its stack, exposed the target, or deviated from the real 200ms OutCubic path",
              );
          }
          if (Math.max(...capture.rows.map((row) => row.time)) < 200)
            throw new Error("Transfer detached before its final painted frame");
          const last = capture.rows.at(-1).face;
          if (["x", "y", "width", "height"].some((key) => Math.abs(last[key] - capture.after.face[key]) > 0.1))
            throw new Error("Transfer jumped at handoff");
          results.push({ width, side, speed, capture });
          console.log(
            `${width}px ${speed} ${side}: whole stack, hidden target, OutCubic trajectory and final handoff passed`,
          );
        } finally {
          await page.close();
        }
      }
  for (const side of ["your", "opponent"]) {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: "reduce" });
    try {
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page.getByRole("menuitem", { name: `Move ${side} breeding card to battle`, exact: true }).click();
      const id = side === "your" ? "you-breeding" : "opponent-breeding";
      await page.waitForFunction((permanentId) => {
        const target = document.querySelector(`.game-battle-row .game-permanent[data-permanent-id="${permanentId}"]`);
        return target && getComputedStyle(target).visibility === "visible";
      }, id);
      if (await page.locator("[data-breeding-transfer], .game-battle-row .battle-burst").count())
        throw new Error("Reduced motion retained a transfer clone or play burst");
      results.push({ side, reduced: true });
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        source: "authored 200ms OutCubic permanent relocation; video-projected trajectory remains unverified",
        results,
      },
      null,
      2,
    ),
  );
  console.log(`${results.length} breeding transfer browser cases passed`);
} finally {
  await browser.close();
}
