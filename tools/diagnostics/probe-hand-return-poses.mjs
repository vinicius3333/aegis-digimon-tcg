#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const output = new URL("../../.local/motion-reference/aegis-hand-returns/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 1440]) {
    for (const fallback of [false, true]) {
      for (const targetScale of [1.1, 0.25]) {
        for (const entering of [false, true]) {
          const page = await browser.newPage({ viewport: { width, height: 900 } });
          try {
            await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
            if (fallback)
              await page.route("**/*", (route) =>
                route.request().resourceType() === "image" && route.request().url().includes("BT25-075")
                  ? route.abort()
                  : route.continue(),
              );
            await page.goto("http://localhost:5174/dev/arena?mode=visual&scenario=crowded");
            await page.locator('.game-battle-row [data-permanent-id="0-field-2"]').waitFor();
            if (fallback)
              await page.waitForFunction(
                () =>
                  !document.querySelector(
                    '.game-permanent[data-permanent-id="0-field-2"] .game-card-enter > [data-state] img',
                  ),
              );
            const captured = await page.evaluate(
              async ({ scale, entering: isEntering }) => {
                const React = (await import("/node_modules/.vite/deps/react.js")).default;
                const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
                const { captureFieldShatterFace } = await import("/src/game/fieldShatter.ts");
                const { HandReturnFlight } = await import("/src/game/HandReturnFlight.tsx");
                const board = document.querySelector(".game-board");
                const permanent = board.querySelector('.game-battle-row [data-permanent-id="0-field-2"]');
                await Promise.all(
                  permanent
                    .getAnimations({ subtree: true })
                    .filter((clock) => clock.effect.getComputedTiming().iterations !== Infinity)
                    .map((clock) => clock.finished.catch(() => {})),
                );
                await Promise.all(
                  [...permanent.querySelectorAll("img")].map((image) => image.decode().catch(() => {})),
                );
                const face = permanent.querySelector(".game-card-enter > [data-state]");
                permanent.style.scale = "0.5";
                face.style.rotate = "90deg";
                if (isEntering) {
                  const entrance = face.parentElement;
                  entrance.style.animation = "battle-card-enter 320ms ease-out both";
                  const clock = entrance.getAnimations()[0];
                  clock.pause();
                  clock.currentTime = 0;
                  await new Promise(requestAnimationFrame);
                }
                const snapshot = captureFieldShatterFace(permanent, board, true);
                const selectors = ["[data-state]"];
                const original = selectors.flatMap((selector) =>
                  [...permanent.querySelectorAll(selector)].map((element) => ({
                    selector,
                    bounds: element.getBoundingClientRect().toJSON(),
                    opacity: Number(getComputedStyle(element).opacity),
                  })),
                );
                permanent.style.visibility = "hidden";
                const host = document.createElement("div");
                board.append(host);
                window.aegisHandPoseRoot = createRoot(host);
                window.aegisHandPoseRoot.render(
                  React.createElement(HandReturnFlight, {
                    flight: {
                      key: 950,
                      x: snapshot.x,
                      y: snapshot.y,
                      dx: 80,
                      dy: -50,
                      duration: 250,
                      card: { cardId: "BT25-075" },
                      handReturn: { ...snapshot, targetScale: scale },
                    },
                  }),
                );
                return { x: snapshot.x, y: snapshot.y, width: snapshot.width, height: snapshot.height, original };
              },
              { scale: targetScale, entering },
            );
            await page.locator('[data-hand-return="950"] [data-deck-return-face]').waitFor();
            assert.ok(captured.original.length > 1, "physical source/link selectors matched no children");
            const samples = [];
            for (const time of [0, 125, 250]) {
              const sample = await page.evaluate(async (age) => {
                const root = document.querySelector('[data-hand-return="950"]');
                for (const clock of root.getAnimations()) {
                  clock.pause();
                  clock.currentTime = age;
                }
                await new Promise(requestAnimationFrame);
                const clone = root.querySelector(".game-permanent");
                const selectors = ["[data-state]"];
                return {
                  scale: Number(getComputedStyle(root).scale),
                  children: selectors.flatMap((selector) =>
                    [...clone.querySelectorAll(selector)].map((element) => ({
                      selector,
                      bounds: element.getBoundingClientRect().toJSON(),
                      opacity: Number(getComputedStyle(element).opacity),
                    })),
                  ),
                };
              }, time);
              const progress = 1 - (1 - time / 250) ** 2;
              const scale = 1 + (targetScale - 1) * progress;
              assert.ok(Math.abs(sample.scale - scale) < 0.001);
              assert.equal(sample.children.length, captured.original.length);
              sample.children.forEach((child, index) => {
                const before = captured.original[index];
                assert.equal(child.selector, before.selector);
                for (const dimension of ["width", "height"])
                  assert.ok(
                    Math.abs(child.bounds[dimension] - before.bounds[dimension] * scale) < 0.3,
                    `${child.selector} ${dimension} changed independently`,
                  );
                // Initial pose must preserve every child's viewport placement exactly.
                if (time === 0)
                  for (const axis of ["x", "y"])
                    assert.ok(
                      Math.abs(child.bounds[axis] - before.bounds[axis]) < 0.3,
                      `${child.selector} ${axis} jumped at departure`,
                    );
                assert.equal(child.opacity, before.opacity);
              });
              samples.push({ time, sample });
              if (time === 125 && !fallback && targetScale === 1.1 && !entering)
                await page.screenshot({ path: new URL(`deep-stack-${width}-125ms.png`, output).pathname });
            }
            await page.evaluate(() => window.aegisHandPoseRoot.unmount());
            assert.equal(await page.locator("[data-hand-return]").count(), 0);
            results.push({ width, fallback, targetScale, entering, captured, samples });
            console.log(
              `${width}px ${fallback ? "fallback" : "decoded"} scale${targetScale}${entering ? " mid-entrance" : ""}: suspended .5 stack child poses passed`,
            );
          } finally {
            await page.close();
          }
        }
      }
    }
  }
  await writeFile(
    new URL("supplemental.json", output),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        results,
        note: "Retained production clones sought to exact phases; these are not natural motion samples.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
