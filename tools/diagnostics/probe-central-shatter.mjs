#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    smoke: { type: "boolean", default: false },
    "playback-only": { type: "boolean", default: false },
    changed: { type: "boolean", default: false },
  },
});
const output = new URL("../../.local/motion-reference/aegis-central-shatter/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const scenes = [
  { name: "destroyed-security", keyword: "Barrier", side: "you" },
  { name: "losing-attacker", menu: "Security battle: your Digimon loses", side: "you" },
];
try {
  for (const width of values["playback-only"] ? [] : values.smoke ? [320] : [320, 1440])
    for (const setting of values.smoke ? ["normal"] : ["normal", "fast", "reduced"])
      for (const scene of scenes.filter((candidate) => !values.changed || !candidate.keyword)) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          reducedMotion: setting === "reduced" ? "reduce" : "no-preference",
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.addInitScript((speed) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis.effect-speed", speed === "reduced" ? "normal" : speed);
          }, setting);
          await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
          await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
          if (scene.keyword) {
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page.getByRole("menuitem", { name: "Automatically preview keywords", exact: true }).click();
            await page.getByRole("button", { name: "Pause after this scene", exact: true }).click();
            await page.getByRole("button", { name: /1\/44 · Blocker/ }).click();
          }
          await page.evaluate(() => {
            const capture = (window.aegisCentralShatter = { rows: [], complete: false });
            let stage;
            function sample() {
              stage ??= document.querySelector(".battle-clash:has(.game-card-shatter)");
              if (stage && !stage.isConnected) {
                capture.complete = true;
                return;
              }
              const root = stage?.querySelector(".battle-clash__shatter");
              if (root) {
                const figure = root.closest(".battle-clash__card");
                const art = figure.querySelector(".battle-clash__art");
                const pieces = [...root.querySelectorAll(".game-card-shatter__shard")];
                const shard = pieces[0];
                const css = getComputedStyle(shard);
                const animation = shard.getAnimations().find((item) => item.animationName === "battle-card-shatter");
                const timing = animation?.effect.getTiming();
                const clocks = pieces.map(
                  (piece) =>
                    piece.getAnimations().find((item) => item.animationName === "battle-card-shatter")?.currentTime,
                );
                const face = shard.firstElementChild;
                capture.rows.push({
                  age: animation ? Number(animation.currentTime) - Number(timing.delay) : null,
                  duration: timing?.duration,
                  delay: timing?.delay,
                  clocks,
                  pieces: pieces.length,
                  side: figure.dataset.side,
                  cause: stage.dataset.cause,
                  rootDisplay: getComputedStyle(root).display,
                  rootOpacity: Number(getComputedStyle(root).opacity),
                  sceneOpacity: Number(getComputedStyle(stage).opacity),
                  opacity: Number(css.opacity),
                  scale: css.scale,
                  rotate: css.rotate,
                  translate: css.translate,
                  dx: parseFloat(css.getPropertyValue("--shard-x")),
                  dy: parseFloat(css.getPropertyValue("--shard-y")),
                  face: face.getBoundingClientRect().toJSON(),
                  card: art.getBoundingClientRect().toJSON(),
                  artOpacity: Number(getComputedStyle(art).opacity),
                  image: face.querySelector("img")?.currentSrc,
                  originalImage: art.querySelector("img")?.currentSrc,
                  cracks: stage.querySelectorAll(".game-card-cracks").length,
                  variant: root.querySelector(".battle-burst")?.dataset.variant,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                });
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          });
          if (scene.keyword) {
            const select = page.getByRole("combobox", { name: "Choose a keyword" });
            const value = await select.locator("option").filter({ hasText: scene.keyword }).getAttribute("value");
            await select.selectOption(value);
          } else {
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page.getByRole("menuitem", { name: scene.menu, exact: true }).click();
          }
          await page.waitForFunction(() => window.aegisCentralShatter.complete, undefined, { timeout: 20000 });
          const capture = await page.evaluate(() => window.aegisCentralShatter);
          await writeFile(new URL(`${scene.name}-${width}-${setting}.json`, output), JSON.stringify(capture, null, 2));
          assert.ok(capture.rows.length > 0);
          assert.deepEqual(errors, []);
          for (const row of capture.rows) {
            assert.equal(row.pieces, 41);
            assert.equal(row.side, scene.side);
            assert.equal(row.cracks, 0);
            assert.equal(row.variant, "evolve");
            assert.equal(row.overflow, false);
            assert.equal(row.image, row.originalImage);
            if (setting === "reduced") {
              assert.equal(row.rootDisplay, "none");
              assert.equal(row.age, null);
              continue;
            }
            assert.equal(row.duration, 250);
            assert.ok(row.clocks.every((clock) => Math.abs(clock - row.clocks[0]) < 0.001));
            assert.equal(row.rotate, "none");
            assert.equal(row.scale, "none");
            if (row.age < 0) {
              assert.equal(row.rootOpacity, 0);
              if (row.clocks[0] >= 150) assert.equal(row.artOpacity, 1, "original disappears before its fracture");
              continue;
            }
            assert.ok(Math.abs(row.face.width - row.card.width) < 0.1, "fragment width differs from displayed card");
            assert.ok(Math.abs(row.face.height - row.card.height) < 0.1, "fragment height differs from displayed card");
            const distance = row.age <= 100 ? row.age / 3100 : Math.min(1, (100 + (row.age - 100) * 20) / 3100);
            const [x, y] = row.translate.split(" ").map(parseFloat);
            assert.ok(Math.abs(x - row.dx * distance) < 0.01);
            assert.ok(Math.abs(y - row.dy * distance) < 0.01);
            assert.equal(row.opacity, row.age < 249.999 ? 1 : 0);
            assert.equal(row.artOpacity, 0, "whole artwork duplicates departing fragments");
            if (row.age < 250) {
              assert.equal(row.rootOpacity, 1);
              assert.equal(row.sceneOpacity, 1, "stage fades before fragment finishes");
            }
          }
          if (setting !== "reduced") {
            assert.ok(capture.rows.some((row) => row.age >= 0 && row.age < 100));
            assert.ok(capture.rows.some((row) => row.age >= 100 && row.age < 250));
            assert.ok(
              capture.rows.some((row) => row.age >= 250),
              "scene unmounted before painted finish",
            );
          }
          assert.equal(await page.locator(".game-card-shatter").count(), 0);
          results.push({ width, setting, scene: scene.name, frames: capture.rows.length });
          console.log(`${width}px ${setting} ${scene.name}: passed`);
        } finally {
          await page.close();
        }
      }
  if (!values.smoke && !values["playback-only"] && !values.changed) {
    for (const width of [320, 1440])
      for (const retainedSeat of [0, 1])
        for (const retainedCause of ["destruction", "attacker"])
          for (const fallback of [false, true]) {
            const page = await browser.newPage({ viewport: { width, height: 900 } });
            try {
              await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
              await page.locator(".game-board").waitFor();
              if (fallback) await page.route(/\.(webp|jpg|png)(\?|$)/, (route) => route.abort());
              await page.evaluate(
                async ({ seat, cause }) => {
                  const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
                  const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
                  const { SecurityClash } = await import("/src/game/SecurityClashView.tsx");
                  const { buildSecurityDestructionScene, buildSecurityClashScene } =
                    await import("/src/game/securityClash.ts");
                  const source = await (await fetch("/src/game/SecurityClashView.tsx")).text();
                  const url = source.match(/from "(\/src\/i18n\/index\.tsx[^" ]*)"/)[1];
                  const { I18nProvider } = await import(url);
                  const scene =
                    cause === "destruction"
                      ? buildSecurityDestructionScene({ key: 998, cardId: "BT1-010", trashedSeat: seat, viewerSeat: 0 })
                      : buildSecurityClashScene({
                          key: 998,
                          revealedCardId: "BT1-019",
                          resolution: "battle",
                          defenderSeat: 1 - seat,
                          viewerSeat: 0,
                          attacker: { seat, cardId: "BT1-010" },
                          battle: {
                            attackerDP: 2000,
                            securityCardDP: 10000,
                            attackerDeleted: true,
                            securityDigimonDeleted: false,
                          },
                        });
                  scene.outcomeAtMs = 0;
                  scene.revealedReady = cause === "attacker";
                  const host = document.createElement("div");
                  host.dataset.retainedCentral = "true";
                  document.querySelector(".game-board").append(host);
                  window.aegisRetainedCentral = createRoot(host);
                  window.aegisRetainedCentral.render(
                    createElement(I18nProvider, null, createElement(SecurityClash, { scene })),
                  );
                },
                { seat: retainedSeat, cause: retainedCause },
              );
              const root = page.locator("[data-retained-central] .battle-clash");
              await root.waitFor({ state: "attached" });
              await root.evaluate((node) => {
                for (const animation of node.getAnimations({ subtree: true })) {
                  animation.pause();
                  animation.currentTime = 0;
                }
              });
              if (fallback)
                await page.waitForFunction(
                  () => !document.querySelector("[data-retained-central] .battle-clash__shatter img"),
                );
              else
                await root.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
              const retained = await root.evaluate((node) => {
                const card = node.querySelector(".battle-clash__card[data-spent=true]");
                const original = card.querySelector(".battle-clash__art");
                for (const animation of original.getAnimations()) {
                  animation.pause();
                  animation.currentTime = 2000;
                }
                const pieces = [...card.querySelectorAll(".game-card-shatter__shard")];
                const originalFace = original.firstElementChild;
                const source = originalFace.getBoundingClientRect();
                const rows = [];
                for (const time of [0, 100, 175, 250]) {
                  for (const animation of card
                    .querySelector(".battle-clash__shatter")
                    .getAnimations({ subtree: true })) {
                    animation.pause();
                    animation.currentTime = Number(animation.effect.getTiming().delay) + time;
                  }
                  const first = pieces[0].firstElementChild;
                  rows.push({
                    time,
                    width: first.getBoundingClientRect().width,
                    height: first.getBoundingClientRect().height,
                    image: first.querySelector("img")?.currentSrc,
                    originalImage: originalFace.querySelector("img")?.currentSrc,
                    opacity: Number(getComputedStyle(pieces[0]).opacity),
                  });
                }
                // This separate specimen screenshot is deliberately sought, unlike natural captures.
                for (const animation of node.getAnimations({ subtree: true })) {
                  animation.pause();
                  animation.currentTime = Number(animation.effect.getTiming().delay) + 100;
                }
                return { pieces: pieces.length, source: source.toJSON(), rows, side: card.dataset.side };
              });
              assert.equal(retained.pieces, 41);
              assert.equal(retained.side, retainedSeat === 0 ? "you" : "opp");
              for (const row of retained.rows) {
                assert.ok(Math.abs(row.width - retained.source.width) < 0.1);
                assert.ok(Math.abs(row.height - retained.source.height) < 0.1);
                assert.equal(row.image, row.originalImage);
                assert.equal(row.opacity, row.time < 250 ? 1 : 0);
                assert.equal(!!row.image, !fallback);
              }
              if (retainedSeat === 0 && retainedCause === "destruction" && !fallback)
                await page.screenshot({ path: new URL(`pose-${width}-100.png`, output).pathname });
              await page.evaluate(() => window.aegisRetainedCentral.unmount());
              results.push({ width, seat: retainedSeat, cause: retainedCause, fallback, retained });
              console.log(`${width}px retained ${retainedSeat} ${retainedCause} fallback=${fallback}: passed`);
            } finally {
              await page.close();
            }
          }
  }
  if (!values.smoke) {
    for (const width of [320, 1440])
      for (const rate of [1, 2, 4]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        try {
          await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
          await page.locator(".game-board").waitFor();
          await page.evaluate(async (playbackRate) => {
            const { createElement, useState } = (await import("/node_modules/.vite/deps/react.js")).default;
            const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
            const { SecurityClash } = await import("/src/game/SecurityClashView.tsx");
            const { buildSecurityClashScene } = await import("/src/game/securityClash.ts");
            const { createAnimationQueue } = await import("/src/game/animationQueue.ts");
            const { waitForSecurityBattleClock } = await import("/src/game/cardShatterClock.ts");
            const { exitSecurityCard } = await import("/src/game/match/present/securityCardExit.ts");
            const source = await (await fetch("/src/game/SecurityClashView.tsx")).text();
            const url = source.match(/from "(\/src\/i18n\/index\.tsx[^" ]*)"/)[1];
            const { I18nProvider } = await import(url);
            const initial = buildSecurityClashScene({
              key: 997,
              revealedCardId: "BT1-019",
              resolution: "battle",
              defenderSeat: 1,
              viewerSeat: 0,
              attacker: { seat: 0, cardId: "BT1-010" },
              battle: { attackerDP: 2000, securityCardDP: 10000, attackerDeleted: true, securityDigimonDeleted: false },
            });
            initial.outcomeAtMs = 0;
            initial.revealedReady = true;
            function Specimen() {
              const [scene, setScene] = useState(initial);
              window.aegisPlaybackSetScene = setScene;
              return scene ? createElement(I18nProvider, null, createElement(SecurityClash, { scene })) : null;
            }
            const host = document.createElement("div");
            document.querySelector(".game-board").append(host);
            const root = createRoot(host);
            root.render(createElement(Specimen));
            const queue = createAnimationQueue();
            queue.setRate(playbackRate);
            window.aegisPlaybackCentral = { rows: [], complete: false };
            // Wait only for React's natural commit; do not seek or pause CSS clocks.
            while (!host.querySelector(".game-card-shatter")) await new Promise(requestAnimationFrame);
            const capture = window.aegisPlaybackCentral;
            const pieces = () => [...host.querySelectorAll(".game-card-shatter__shard")];
            function sample() {
              const shard = pieces()[0];
              if (!shard) return;
              const clock = shard.getAnimations().find((entry) => entry.animationName === "battle-card-shatter");
              const age = Number(clock.currentTime) - Number(clock.effect.getTiming().delay);
              capture.rows.push({
                age,
                opacity: Number(getComputedStyle(shard).opacity),
                stageOpacity: Number(getComputedStyle(host.querySelector(".battle-clash")).opacity),
                exiting: !!host.querySelector("[data-exiting=true]"),
              });
              if (!capture.complete) requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
            queue.enqueue({
              id: "playback-fracture",
              track: "central",
              async run(context) {
                await context.wait(350);
                await waitForSecurityBattleClock(997, context);
                capture.checkedExitAt = performance.now();
                await exitSecurityCard({
                  key: 997,
                  context,
                  shatter: true,
                  setSecurityClash: window.aegisPlaybackSetScene,
                });
                const clock = pieces()[0]
                  .getAnimations()
                  .find((entry) => entry.animationName === "battle-card-shatter");
                capture.finalAge = Number(clock.currentTime) - Number(clock.effect.getTiming().delay);
                capture.playState = clock.playState;
                capture.complete = true;
                root.unmount();
              },
            });
          }, rate);
          await page.waitForFunction(() => window.aegisPlaybackCentral.complete);
          const capture = await page.evaluate(() => window.aegisPlaybackCentral);
          assert.ok(capture.finalAge >= 250);
          assert.equal(capture.playState, "finished");
          assert.ok(capture.rows.some((row) => row.age >= 0 && row.age < 250));
          assert.ok(
            capture.rows.every((row) => !row.exiting || row.age >= -20),
            "checked disposal begins before impact/settle finish",
          );
          assert.ok(
            capture.rows
              .filter((row) => row.age >= 0 && row.age < 250)
              .every((row) => row.opacity === 1 && row.stageOpacity === 1),
          );
          assert.equal(await page.locator(".game-card-shatter").count(), 0);
          results.push({ width, rate, naturalQueuePlayback: capture });
          console.log(`${width}px actual CSS/queue playback ${rate}x: passed`);
        } finally {
          await page.close();
        }
      }
  }
  await writeFile(
    new URL(
      values.smoke
        ? "smoke.json"
        : values["playback-only"]
          ? "playback.json"
          : values.changed
            ? "changed.json"
            : "capture.json",
      output,
    ),
    JSON.stringify(
      {
        results,
        note: "Natural Arena playback. Shared authored geometry and clock; radial endpoints remain a planar adaptation.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
