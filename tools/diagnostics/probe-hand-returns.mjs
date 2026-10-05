#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const output = new URL("../../.local/motion-reference/aegis-hand-returns/", import.meta.url);
await mkdir(output, { recursive: true });
const cases = [320, 768, 1024, 1440].flatMap((width) =>
  [0, 1].map((seat) => ({ width, seat, count: 1, speed: "normal" })),
);
cases.push(...[320, 1440].flatMap((width) => [0, 1].map((seat) => ({ width, seat, count: 2, speed: "normal" }))));
cases.push(...[320, 1440].flatMap((width) => [0, 1].map((seat) => ({ width, seat, count: 1, speed: "fast" }))));
cases.push(...[320, 1440].map((width) => ({ width, seat: 0, count: 1, speed: "normal", crowded: true })));
cases.push(
  ...[320, 1440].flatMap((width) => [0, 1].map((seat) => ({ width, seat, count: 1, speed: "normal", reduced: true }))),
);
const browser = await chromium.launch();
const results = [];
const selected = process.argv.includes("--smoke")
  ? cases.slice(0, 2)
  : process.argv.includes("--changed")
    ? cases.filter((settings) => settings.count === 2 || settings.crowded)
    : cases;
const filename = process.argv.includes("--smoke")
  ? "smoke.json"
  : process.argv.includes("--changed")
    ? "changed.json"
    : "capture.json";
const outQuad = (value) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 2;
try {
  for (const settings of selected) {
    const { width, seat, count, speed, crowded, reduced } = settings;
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript((setting) => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.effect-speed", setting);
      }, speed);
      await page.goto(`http://localhost:5174/dev/arena?mode=visual${crowded ? "&scenario=crowded" : ""}`);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      if (crowded) {
        await page.getByRole("button", { name: "Demo tools", exact: true }).click();
        await page.getByRole("menuitem", { name: /Toggle deep stack suspension/ }).click();
      }
      await page.locator(".game-battle-row .game-permanent").evaluateAll(async (cards) => {
        await Promise.all(
          cards.flatMap((card) => [...card.querySelectorAll("img")].map((image) => image.decode().catch(() => {}))),
        );
        await Promise.all(
          cards.flatMap((card) =>
            card
              .getAnimations({ subtree: true })
              .filter((clock) => clock.effect.getComputedTiming().iterations !== Infinity)
              .map((clock) => clock.finished.catch(() => {})),
          ),
        );
      });
      const expected = await page.evaluate(
        async ({ ownerSeat, targetCount }) => {
          const { createArenaDemoState } = await import("/src/dev/ArenaDemo.tsx");
          const owner = createArenaDemoState().players[ownerSeat];
          return [
            ...owner.battleArea.filter((host) => host.stack.length >= 2),
            ...owner.battleArea.filter((host) => host.stack.length < 2),
          ]
            .slice(0, targetCount)
            .map((host) => ({
              permanentId: host.permanentId,
              instanceId: host.topCard.instanceId,
              cardId: host.topCard.cardId,
              sources: host.stack.length,
              linked: host.linked.length,
            }));
        },
        { ownerSeat: seat, targetCount: count },
      );
      await page.evaluate(
        ({ targets, ownerSeat }) => {
          const capture = (window.aegisHandReturnCapture = {
            rows: [],
            complete: false,
            arrivals: [],
            ends: {},
            starts: {},
          });
          const originals = {};
          for (const target of targets) {
            const face = document.querySelector(
              `.game-battle-row [data-permanent-id="${target.permanentId}"] .game-card-enter > [data-state]`,
            );
            const style = getComputedStyle(face);
            originals[target.permanentId] = {
              image: face.querySelector("img")?.currentSrc,
              border: style.border,
              width: parseFloat(style.width),
              height: parseFloat(style.height),
            };
          }
          const strip = document.querySelector(".game-opponent-hand");
          const initialOpponentCount = Number(strip?.dataset.handCount);
          function sample() {
            const roots = [...document.querySelectorAll("[data-hand-return]")];
            const now = performance.now();
            for (const root of roots) {
              const id = root.dataset.permanentId;
              capture.starts[id] ??= now;
              const face = root.querySelector("[data-deck-return-face]");
              const css = getComputedStyle(root),
                faceCss = getComputedStyle(face);
              const stackCss = getComputedStyle(root.firstElementChild);
              const clock = root.getAnimations()[0];
              const hand = document.querySelector(ownerSeat === 0 ? ".game-hand-dock" : ".game-opponent-hand");
              capture.rows.push({
                id,
                now,
                time: clock?.currentTime,
                duration: clock?.effect.getTiming().duration,
                root: root.getBoundingClientRect().toJSON(),
                face: face.getBoundingClientRect().toJSON(),
                hand: hand.getBoundingClientRect().toJSON(),
                original: originals[id],
                image: face.querySelector("img")?.currentSrc,
                border: faceCss.border,
                opacity: Number(faceCss.opacity),
                width: parseFloat(css.width),
                height: parseFloat(css.height),
                scale: Number(css.scale),
                angle: (parseFloat(stackCss.rotate) || 0) + (parseFloat(faceCss.rotate) || 0),
                dx: parseFloat(css.getPropertyValue("--hand-return-dx")),
                dy: parseFloat(css.getPropertyValue("--hand-return-dy")),
                translation: css.translate.split(" ").map(parseFloat),
                extras: [...root.querySelectorAll("[data-deck-return-extra]")].map((extra) =>
                  Number(getComputedStyle(extra).opacity),
                ),
                originals: document.querySelectorAll(`.game-battle-row [data-permanent-id="${id}"]`).length,
                interactive: !!root.querySelector("[tabindex], [data-drop], [data-permanent-id]"),
                active: roots.length,
                handHasReturned:
                  ownerSeat === 0 &&
                  targets.some((target) =>
                    document.querySelector(`.game-hand-dock [data-hand-instance-id="${target.instanceId}"]`),
                  ),
              });
            }
            for (const target of targets) {
              if (
                capture.starts[target.permanentId] &&
                !roots.some((root) => root.dataset.permanentId === target.permanentId)
              )
                capture.ends[target.permanentId] ??= now;
            }
            const allGone = targets.every(
              (target) => !document.querySelector(`.game-battle-row [data-permanent-id="${target.permanentId}"]`),
            );
            const arrived =
              ownerSeat === 0
                ? targets.every((target) =>
                    document.querySelector(`.game-hand-dock [data-hand-instance-id="${target.instanceId}"]`),
                  )
                : Number(strip?.dataset.handCount) === initialOpponentCount + targets.length;
            if (arrived && allGone && !roots.length) {
              capture.arrivals.push(now);
              capture.complete = true;
              return;
            }
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        },
        { targets: expected, ownerSeat: seat },
      );
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page
        .getByRole("menuitem", {
          name: `Return ${count} Digimon to hand: ${seat === 0 ? "your" : "opponent"}`,
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.aegisHandReturnCapture.complete);
      const capture = await page.evaluate(() => window.aegisHandReturnCapture);
      await writeFile(
        new URL("last-case.json", output),
        JSON.stringify({ settings, expected, capture, errors }, null, 2),
      );
      assert.deepEqual(errors, []);
      if (reduced) assert.equal(capture.rows.length, 0);
      else {
        for (const target of expected) {
          const rows = capture.rows.filter((row) => row.id === target.permanentId);
          assert.ok(rows.some((row) => row.time > 0 && row.time < 250));
          assert.ok(
            rows.some((row) => row.time >= 250),
            "last painted arrival cut short",
          );
          const targetScale = seat === 0 ? 1.1 : 0.25;
          for (const row of rows) {
            assert.equal(row.duration, 250);
            assert.equal(row.image, row.original.image);
            assert.equal(row.border, row.original.border);
            assert.equal(row.opacity, 1);
            assert.equal(row.originals, 0);
            assert.equal(row.interactive, false);
            assert.equal(row.active, 1, "whole returns overlap");
            assert.equal(row.handHasReturned, false, "hand entry preceded last stack return");
            assert.ok(row.extras.length >= target.sources);
            assert.ok(row.extras.every((opacity) => opacity === 1));
            assert.ok(Math.abs(row.scale - (1 + (targetScale - 1) * outQuad(row.time / 250))) < 0.001);
            row.translation.forEach((value, axis) =>
              assert.ok(Math.abs(value - (axis ? row.dy : row.dx) * outQuad(row.time / 250)) < 0.3),
            );
            const physicalWidth = (row.angle === 90 ? row.height : row.width) * row.scale;
            assert.ok(Math.abs(row.face.width - physicalWidth) < 0.3, "stack child scale mismatched");
            if (row.time >= 250) {
              assert.ok(Math.abs(row.face.x + row.face.width / 2 - row.hand.x - row.hand.width / 2) < 0.3);
              assert.ok(Math.abs(row.face.y + row.face.height / 2 - row.hand.y - row.hand.height / 2) < 0.3);
            }
          }
        }
        const lastEnd = Math.max(...Object.values(capture.ends));
        assert.ok(capture.arrivals[0] - lastEnd >= (speed === "fast" ? 35 : 75), "100ms pause missing");
      }
      assert.equal(await page.locator("[data-hand-return], [data-deck-return]").count(), 0);
      results.push({ settings, expected, capture });
      await writeFile(
        new URL(filename, output),
        JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2),
      );
      console.log(
        `${width}px seat${seat} ${count}return ${speed}${crowded ? " suspended deep stack" : ""}${reduced ? " reduced" : ""}: hand return and cleanup passed`,
      );
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
