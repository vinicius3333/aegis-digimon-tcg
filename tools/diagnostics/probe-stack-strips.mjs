#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    "reduced-only": { type: "boolean", default: false },
  },
});
const output = new URL("../../.local/motion-reference/aegis-stack-strips/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const cases = [320, 768, 1024, 1440].flatMap((width) =>
  [0, 1].flatMap((seat) => ["sources", "top"].map((kind) => ({ width, seat, kind, speed: "normal" }))),
);
cases.push(...[320, 1440].flatMap((width) => [0, 1].map((seat) => ({ width, seat, kind: "sources", speed: "fast" }))));
const outQuad = (progress) => 1 - (1 - Math.max(0, Math.min(1, progress))) ** 2;
try {
  for (const settings of values["reduced-only"] ? [] : cases) {
    const { width, seat, kind, speed } = settings;
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
      await page.locator(".game-battle-row .game-permanent").evaluateAll(async (cards) => {
        await Promise.all(
          cards.flatMap((card) => [...card.querySelectorAll("img")].map((image) => image.decode().catch(() => {}))),
        );
        await Promise.all(
          cards.flatMap((card) =>
            card
              .getAnimations({ subtree: true })
              .filter((animation) => animation.effect.getComputedTiming().iterations !== Infinity)
              .map((animation) => animation.finished.catch(() => {})),
          ),
        );
      });
      const expected = await page.evaluate(
        async ({ seat: ownerSeat, kind: removalKind }) => {
          const { createArenaDemoState } = await import("/src/dev/ArenaDemo.tsx");
          const host = createArenaDemoState().players[ownerSeat].battleArea.find(
            (permanent) => permanent.stack.length >= 2,
          );
          const root = document.querySelector(`.game-permanent[data-permanent-id="${host.permanentId}"]`);
          window.aegisHostEntrance = root.querySelector(".game-card-enter");
          const face = root.querySelector(".game-card-enter > [data-state]");
          return {
            permanentId: host.permanentId,
            cards: (removalKind === "top" ? [host.topCard] : host.stack.slice(-2)).map((card) => card.cardId),
            width: parseFloat(getComputedStyle(face).width),
            height: parseFloat(getComputedStyle(face).height),
          };
        },
        { seat, kind },
      );
      await page.evaluate(
        ({ permanentId, count }) => {
          const capture = (window.aegisStripCapture = { rows: [], complete: false, entranceStable: true });
          const seen = new Set();
          const pixels = (value, size) => parseFloat(value) * (value.endsWith("%") ? size / 100 : 1);
          function sample() {
            const host = document.querySelector(`.game-permanent[data-permanent-id="${permanentId}"]`);
            capture.entranceStable &&= host?.querySelector(".game-card-enter") === window.aegisHostEntrance;
            const roots = [...document.querySelectorAll("[data-stack-strip]")];
            for (const root of roots) {
              seen.add(root.dataset.stackStrip);
              const sway = root.querySelector(".game-stack-strip-peel__sway");
              const face = root.querySelector(".game-stack-strip-peel__face");
              const rim = root.querySelector(".game-stack-strip-peel__rim");
              const rootStyle = getComputedStyle(root);
              const rootWidth = parseFloat(rootStyle.width);
              const rootHeight = parseFloat(rootStyle.height);
              const components = (element, axisSize) =>
                getComputedStyle(element)
                  .translate.split(" ")
                  .map((value, axis) => pixels(value, axisSize[axis]));
              const clock = face.getAnimations()[0];
              capture.rows.push({
                key: root.dataset.stackStrip,
                cardId: root.dataset.cardId,
                permanentId: root.dataset.permanentId,
                count: roots.length,
                time: clock?.currentTime,
                duration: clock?.effect.getTiming().duration,
                width: rootWidth,
                height: rootHeight,
                y: components(root, [rootWidth, rootHeight])[1],
                x: components(sway, [rootWidth, rootHeight])[0],
                opacity: Number(getComputedStyle(face).opacity),
                rim: Number(getComputedStyle(rim).opacity),
                fill: getComputedStyle(face).fill,
                stroke: getComputedStyle(rim).stroke,
                rotate: rootStyle.rotate,
                scale: rootStyle.scale,
                overflow: document.documentElement.scrollWidth > innerWidth,
              });
            }
            if (seen.size === count && !roots.length) {
              capture.complete = true;
              return;
            }
            requestAnimationFrame(sample);
          }
          requestAnimationFrame(sample);
        },
        { permanentId: expected.permanentId, count: expected.cards.length },
      );
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page
        .getByRole("menuitem", {
          name: `Remove ${kind === "sources" ? "2 sources" : "stack top"}: ${seat === 0 ? "your" : "opponent"}`,
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.aegisStripCapture.complete);
      const capture = await page.evaluate(() => window.aegisStripCapture);
      await writeFile(
        new URL("last-case.json", output),
        JSON.stringify({ ...settings, expected, capture, errors }, null, 2),
      );
      assert.deepEqual(errors, []);
      assert.equal(capture.entranceStable, true, "host entrance remounted during source loss");
      const keys = [...new Set(capture.rows.map((row) => row.key))];
      assert.equal(keys.length, expected.cards.length);
      assert.deepEqual(
        keys.map((key) => capture.rows.find((row) => row.key === key).cardId),
        expected.cards,
      );
      for (const key of keys) {
        const rows = capture.rows.filter((row) => row.key === key);
        assert.ok(
          rows.some((row) => row.time > 0 && row.time < 85),
          "first lateral tween missed",
        );
        assert.ok(
          rows.some((row) => row.time > 170 && row.time < 255),
          "return tween missed",
        );
        assert.ok(
          rows.some((row) => row.time > 255 && row.time < 425),
          "hold missed",
        );
        assert.ok(
          rows.some((row) => row.time > 425 && row.time < 595),
          "fade missed",
        );
        assert.ok(
          rows.some((row) => row.time >= 595 && row.opacity === 0),
          "completed fade cut short",
        );
      }
      for (const row of capture.rows) {
        const direction = seat === 0 ? 1 : -1;
        assert.equal(row.count, 1, "sources overlap");
        assert.equal(row.duration, 595);
        assert.equal(row.permanentId, expected.permanentId);
        assert.ok(Math.abs(row.width - (expected.width * 2) / 9) < 0.1);
        assert.ok(Math.abs(row.height - (expected.height * 2) / 9) < 0.1);
        assert.equal(row.fill, "rgb(0, 0, 0)");
        assert.notEqual(row.stroke, "rgb(0, 0, 0)");
        assert.equal(row.rotate, "none");
        assert.equal(row.scale, "none");
        assert.equal(row.overflow, false);
        const time = Math.min(595, row.time);
        const lateral = time < 85 ? outQuad(time / 85) : time < 170 ? 1 : 1 - outQuad((time - 170) / 85);
        assert.ok(Math.abs(row.x - direction * row.width * 0.75 * lateral) < 0.15, `lateral path at ${time}ms`);
        assert.ok(
          Math.abs(row.y + ((direction * row.height * 22) / 28) * outQuad(time / 170)) < 0.15,
          `vertical path at ${time}ms`,
        );
        assert.ok(Math.abs(row.opacity - (1 - outQuad((time - 425) / 170))) < 0.01, `fade at ${time}ms`);
        assert.equal(row.rim, time < 425 ? 1 : 0);
      }
      results.push({ ...settings, expected, capture });
      console.log(
        `${width}px seat ${seat} ${kind} ${speed}: ordered silhouettes, source timing, host entrance and final paint passed`,
      );
    } finally {
      await page.close();
    }
  }
  for (const width of [320, 1440]) {
    for (const seat of [0, 1]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      try {
        await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
        await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        const hostAfter = await page.evaluate(async (ownerSeat) => {
          const { createArenaDemoState } = await import("/src/dev/ArenaDemo.tsx");
          const host = createArenaDemoState().players[ownerSeat].battleArea.find(
            (permanent) => permanent.stack.length >= 2,
          );
          return { id: host.permanentId, count: host.stack.length - 2 };
        }, seat);
        await page.evaluate(() => {
          window.aegisReducedStrip = { observed: false };
          const observer = new MutationObserver(() => {
            if (document.querySelector("[data-stack-strip]")) window.aegisReducedStrip.observed = true;
          });
          observer.observe(document.querySelector(".game-board"), { subtree: true, childList: true });
          window.aegisReducedStrip.observer = observer;
        });
        await page.getByRole("button", { name: "Demo tools", exact: true }).click();
        await page
          .getByRole("menuitem", { name: `Remove 2 sources: ${seat === 0 ? "your" : "opponent"}`, exact: true })
          .click();
        await page.waitForFunction(({ id, count }) => {
          const host = document.querySelector(`.game-permanent[data-permanent-id="${id}"]`);
          return host?.querySelector(".game-source-badge")?.textContent.includes(`×${count}`);
        }, hostAfter);
        const natural = await page.evaluate(() => window.aegisReducedStrip.observed);
        assert.equal(natural, false);
        await page.evaluate(async () => {
          window.aegisReducedStrip.observer.disconnect();
          const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const { StackStripPeel } = await import("/src/game/StackStripPeel.tsx");
          const host = document.createElement("div");
          document.querySelector(".game-board").append(host);
          window.aegisRetainedStrip = createRoot(host);
          window.aegisRetainedStrip.render(
            createElement(
              "span",
              { className: "game-stack-strip-peel", "data-retained-strip": true },
              createElement(StackStripPeel, { color: "Blue" }),
            ),
          );
        });
        const retained = page.locator("[data-retained-strip]");
        await retained.waitFor({ state: "attached" });
        assert.deepEqual(
          await retained.evaluate((root) => ({
            display: getComputedStyle(root).display,
            clocks: root.getAnimations({ subtree: true }).length,
          })),
          { display: "none", clocks: 0 },
        );
        results.push({ width, seat, reduced: true, naturalObserved: natural, retainedHidden: true });
        console.log(`${width}px seat ${seat}: natural drain and retained reduced-motion suppression passed`);
      } finally {
        await page.close();
      }
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify({ capturedAt: new Date().toISOString(), base: values.base, results }, null, 2),
  );
} finally {
  await browser.close();
}
