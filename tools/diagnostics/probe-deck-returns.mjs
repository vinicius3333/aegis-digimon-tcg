#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const output = new URL("../../.local/motion-reference/aegis-deck-returns/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const cases = [320, 768, 1024, 1440].flatMap((width) =>
  [0, 1].map((seat) => ({ width, seat, speed: "normal", crowded: false })),
);
cases.push(...[320, 1440].flatMap((width) => [0, 1].map((seat) => ({ width, seat, speed: "fast", crowded: false }))));
cases.push(...[320, 1440].map((width) => ({ width, seat: 0, speed: "normal", crowded: true })));
const outQuad = (value) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 2;
try {
  for (const settings of process.argv.includes("--smoke") ? cases.slice(0, 2) : cases) {
    const { width, seat, speed, crowded } = settings;
    const page = await browser.newPage({ viewport: { width, height: 900 } });
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
      const expected = await page.evaluate(async (ownerSeat) => {
        const { createArenaDemoState } = await import("/src/dev/ArenaDemo.tsx");
        const host = createArenaDemoState().players[ownerSeat].battleArea.find(
          (permanent) => permanent.stack.length >= 2,
        );
        return {
          permanentId: host.permanentId,
          cardId: host.topCard.cardId,
          sources: host.stack.length,
          linked: host.linked.length,
        };
      }, seat);
      await page.evaluate(
        ({ permanentId, ownerSeat }) => {
          const capture = (window.aegisReturnCapture = { rows: [], complete: false });
          const rect = Element.prototype.getBoundingClientRect;
          let original;
          Element.prototype.getBoundingClientRect = function () {
            const bounds = rect.call(this);
            if (
              this.matches(".game-card-enter > [data-state]") &&
              this.closest(".game-permanent")?.dataset.permanentId === permanentId
            ) {
              const css = getComputedStyle(this);
              original = {
                rect: bounds.toJSON(),
                width: parseFloat(css.width),
                height: parseFloat(css.height),
                image: this.querySelector("img")?.currentSrc,
                border: css.border,
              };
            }
            return bounds;
          };
          let seen = false;
          const pixels = (value, size) => parseFloat(value) * (value.endsWith("%") ? size / 100 : 1);
          function sample() {
            const root = document.querySelector("[data-deck-return]");
            if (root) {
              seen = true;
              const face = root.querySelector("[data-deck-return-face]");
              const deck = document.querySelector(
                ownerSeat === 0 ? ".game-utility-slot--you-deck" : ".game-utility-slot--opp-deck",
              );
              const css = getComputedStyle(root);
              const clock = root.getAnimations()[0];
              const translation = css.translate
                .split(" ")
                .map((value, axis) => pixels(value, axis ? parseFloat(css.height) : parseFloat(css.width)));
              capture.rows.push({
                time: clock?.currentTime,
                duration: clock?.effect.getTiming().duration,
                faceTime: face?.getAnimations()[0]?.currentTime,
                original,
                face: face?.getBoundingClientRect().toJSON(),
                root: root.getBoundingClientRect().toJSON(),
                deck: deck?.getBoundingClientRect().toJSON(),
                border: face && getComputedStyle(face).border,
                image: face?.querySelector("img")?.currentSrc,
                rotation: face && getComputedStyle(face).rotate,
                opacity: face && Number(getComputedStyle(face).opacity),
                extras: [...root.querySelectorAll("[data-deck-return-extra]")].map((extra) =>
                  Number(getComputedStyle(extra).opacity),
                ),
                width: parseFloat(css.width),
                height: parseFloat(css.height),
                dx: parseFloat(css.getPropertyValue("--deck-return-dx")),
                dy: parseFloat(css.getPropertyValue("--deck-return-dy")),
                translation,
                overflow: document.documentElement.scrollWidth > innerWidth,
                interactive: !!root.querySelector("[tabindex], [data-drop], [data-permanent-id]"),
                originals: document.querySelectorAll(`.game-battle-row [data-permanent-id="${permanentId}"]`).length,
              });
            }
            if (seen && !root) {
              Element.prototype.getBoundingClientRect = rect;
              capture.complete = true;
              return;
            }
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        },
        { permanentId: expected.permanentId, ownerSeat: seat },
      );
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page
        .getByRole("menuitem", { name: `Return Digimon to deck: ${seat === 0 ? "your" : "opponent"}`, exact: true })
        .click();
      await page.waitForFunction(() => window.aegisReturnCapture.complete);
      const capture = await page.evaluate(() => window.aegisReturnCapture);
      await writeFile(
        new URL("last-case.json", output),
        JSON.stringify({ ...settings, expected, capture, errors }, null, 2),
      );
      assert.deepEqual(errors, []);
      assert.ok(capture.rows.some((row) => row.time > 0 && row.time < 250));
      assert.ok(capture.rows.some((row) => row.time > 250 && row.time < 410));
      assert.ok(
        capture.rows.some((row) => row.time >= 410 && row.opacity === 0),
        "fade finish cut short",
      );
      for (const row of capture.rows) {
        assert.ok(row.original && row.face, "physical departing stack missing");
        assert.equal(row.duration, 410);
        assert.equal(row.image, row.original.image);
        assert.equal(row.border, row.original.border);
        assert.equal(row.rotation, "none");
        assert.equal(row.originals, 0, "resting permanent duplicated during return");
        assert.equal(row.interactive, false);
        assert.equal(row.overflow, false);
        assert.ok(row.extras.length >= expected.sources);
        assert.ok(Math.abs(row.width - row.original.width) < 0.15);
        assert.ok(Math.abs(row.height - row.original.height) < 0.15);
        assert.ok(
          Math.abs(row.face.width - row.width) < 0.15 && Math.abs(row.face.height - row.height) < 0.15,
          "snapshot child scale mismatch",
        );
        assert.ok(
          Math.abs(row.face.x - row.root.x) < 0.2 && Math.abs(row.face.y - row.root.y) < 0.2,
          "printed face alignment jumped",
        );
        assert.ok(Math.abs(row.faceTime - row.time) < 0.05, "movement/fade clocks diverged");
        row.translation.forEach((value, axis) =>
          assert.ok(Math.abs(value - (axis ? row.dy : row.dx) * outQuad(row.time / 250)) < 0.2),
        );
        assert.ok(Math.abs(row.opacity - (1 - outQuad((row.time - 250) / 160))) < 0.01);
        assert.ok(
          row.extras.every((opacity) => opacity === (row.time < 250 ? 1 : 0)),
          "field chrome survives arrival",
        );
        if (row.time >= 250) {
          assert.ok(row.deck, "destination pile missing");
          assert.ok(Math.abs(row.face.x + row.face.width / 2 - row.deck.x - row.deck.width / 2) < 0.2);
          assert.ok(Math.abs(row.face.y + row.face.height / 2 - row.deck.y - row.deck.height / 2) < 0.2);
        }
      }
      results.push({ ...settings, expected, capture });
      console.log(
        `${width}px seat ${seat} ${speed}${crowded ? " suspended deep stack" : ""}: physical upright stack, 250/160ms timing, deck destination and cleanup passed`,
      );
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL(process.argv.includes("--smoke") ? "smoke.json" : "capture.json", output),
    JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2),
  );
} finally {
  await browser.close();
}
