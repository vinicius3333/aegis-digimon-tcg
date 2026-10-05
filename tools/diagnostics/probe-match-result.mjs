#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-match-result/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 768, 1024, 1440])
    for (const outcome of ["win", "loss", "draw"])
      for (const reduced of [false, true]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
          await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
          await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
          await page.evaluate(() => {
            window.aegisResult = { rows: [], complete: false };
            let started;
            function sample() {
              const root = document.querySelector(".game-result");
              if (root) {
                started ??= performance.now();
                const title = root.querySelector(".game-result__title");
                const style = getComputedStyle(title);
                window.aegisResult.rows.push({
                  age: performance.now() - started,
                  title: title.textContent,
                  rect: title.getBoundingClientRect().toJSON(),
                  opacity: getComputedStyle(root).opacity,
                  titleOpacity: style.opacity,
                  scale: style.scale,
                  filter: style.filter,
                  clocks: root.getAnimations().length + title.getAnimations().length,
                  controls: [...root.querySelectorAll("button")].map((button) => ({
                    enabled: !button.disabled,
                    label: button.textContent,
                    rect: button.getBoundingClientRect().toJSON(),
                  })),
                  focused: root.querySelector("button") === document.activeElement,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                });
                if (performance.now() - started >= 540) {
                  window.aegisResult.complete = true;
                  return;
                }
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          });
          await page.getByRole("button", { name: "Demo tools", exact: true }).click();
          await page.getByRole("menuitem", { name: `Preview result: ${outcome}`, exact: true }).click();
          await page.waitForFunction(() => window.aegisResult.complete);
          const capture = await page.evaluate(() => window.aegisResult);
          assert.deepEqual(errors, []);
          assert.ok(capture.rows.length >= 3);
          const expected = outcome === "win" ? "Victory" : outcome === "loss" ? "Defeat" : "Draw";
          const first = capture.rows[0];
          for (const row of capture.rows) {
            assert.equal(row.title, expected);
            assert.equal(row.opacity, "1");
            assert.equal(row.titleOpacity, "1");
            assert.ok(["none", "1"].includes(row.scale));
            assert.equal(row.filter, "none");
            assert.equal(row.clocks, 0);
            assert.equal(row.overflow, false);
            assert.equal(row.focused, true);
            assert.equal(row.controls.length, 2);
            assert.ok(
              row.controls.every((button) => button.enabled && button.rect.width >= 44 && button.rect.height >= 44),
            );
            for (const key of ["x", "y", "width", "height"])
              assert.ok(
                Math.abs(row.rect[key] - first.rect[key]) < 0.1,
                `${outcome}: result moved after its first painted frame`,
              );
          }
          if (width === 320 && !reduced && outcome === "win")
            await page.screenshot({ path: new URL("result-320.png", output).pathname });
          results.push({ width, outcome, reduced, capture });
          console.log(
            `${width}px ${outcome} reduce=${reduced}: immediate settled result, focused actions, no zoom/blur passed`,
          );
        } finally {
          await page.close();
        }
      }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      { source: "authored immediate result activation; provided video contains no match-result transition", results },
      null,
      2,
    ),
  );
  console.log(`${results.length} result browser cases passed`);
} finally {
  await browser.close();
}
