#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const output = new URL("../../.local/motion-reference/aegis-deck-returns/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const outQuad = (value) => 1 - (1 - Math.max(0, Math.min(1, value))) ** 2;
try {
  for (const width of [320, 1440]) {
    for (const fallback of [false, true]) {
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
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        await page.locator('.game-battle-row .game-permanent[data-permanent-id="0-field-2"]').waitFor();
        if (fallback)
          await page.waitForFunction(
            () =>
              !document.querySelector(
                '.game-permanent[data-permanent-id="0-field-2"] .game-card-enter > [data-state] img',
              ),
          );
        await page.evaluate(async () => {
          const React = (await import("/node_modules/.vite/deps/react.js")).default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const { captureFieldShatterFace } = await import("/src/game/fieldShatter.ts");
          const { DeckReturnFlight } = await import("/src/game/DeckReturnFlight.tsx");
          const board = document.querySelector(".game-board");
          const permanent = board.querySelector('.game-battle-row .game-permanent[data-permanent-id="0-field-2"]');
          await Promise.all(
            permanent
              .getAnimations({ subtree: true })
              .filter((clock) => clock.effect.getComputedTiming().iterations !== Infinity)
              .map((clock) => clock.finished.catch(() => {})),
          );
          const face = permanent.querySelector(".game-card-enter > [data-state]");
          await Promise.all([...face.querySelectorAll("img")].map((image) => image.decode().catch(() => {})));
          permanent.style.scale = "0.5";
          face.style.rotate = "90deg";
          const captured = captureFieldShatterFace(permanent, board, true);
          permanent.style.visibility = "hidden";
          const host = document.createElement("div");
          board.append(host);
          window.aegisRetainedReturn = createRoot(host);
          window.aegisRetainedReturn.render(
            React.createElement(DeckReturnFlight, {
              flight: {
                key: 900,
                x: captured.x,
                y: captured.y,
                dx: 80,
                dy: -50,
                duration: 410,
                card: { cardId: "BT25-075" },
                deckReturn: captured,
              },
            }),
          );
        });
        const flight = page.locator('[data-deck-return="900"]');
        await flight.waitFor();
        const poses = [];
        for (const time of [0, 125, 250, 290, 410]) {
          const pose = await flight.evaluate((root, age) => {
            for (const clock of root.getAnimations({ subtree: true })) {
              clock.pause();
              clock.currentTime = age;
            }
            const face = root.querySelector("[data-deck-return-face]");
            return {
              time: age,
              root: root.getBoundingClientRect().toJSON(),
              face: face.getBoundingClientRect().toJSON(),
              opacity: Number(getComputedStyle(face).opacity),
              fallback: !face.querySelector("img"),
              scale: getComputedStyle(root.firstElementChild).transform,
              extras: [...root.querySelectorAll("[data-deck-return-extra]")].map((extra) =>
                Number(getComputedStyle(extra).opacity),
              ),
            };
          }, time);
          assert.equal(pose.fallback, fallback);
          assert.ok(
            Math.abs(pose.root.width - pose.face.width) < 0.1 && Math.abs(pose.root.height - pose.face.height) < 0.1,
          );
          assert.ok(Math.abs(pose.root.x - pose.face.x) < 0.1 && Math.abs(pose.root.y - pose.face.y) < 0.1);
          assert.ok(pose.scale.startsWith("matrix(0.5,"));
          assert.ok(Math.abs(pose.opacity - (1 - outQuad((time - 250) / 160))) < 0.01);
          assert.ok(
            pose.extras.every((opacity) => opacity === (time < 250 ? 1 : 0)),
            JSON.stringify({ time, extras: pose.extras }),
          );
          poses.push(pose);
          if (!fallback && time === 125)
            await page.screenshot({ path: new URL(`deep-stack-${width}-125ms.png`, output).pathname });
        }
        results.push({ width, retained: true, fallback, poses });
        console.log(
          `${width}px retained 50% upright suspended ${fallback ? "fallback" : "decoded"} stack: child geometry and sought poses passed`,
        );
      } finally {
        await page.close();
      }
    }
    for (const seat of [0, 1]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      try {
        await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
        await page.goto("http://localhost:5174/dev/arena?mode=visual");
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        const permanentId = await page.evaluate(async (ownerSeat) => {
          const { createArenaDemoState } = await import("/src/dev/ArenaDemo.tsx");
          return createArenaDemoState().players[ownerSeat].battleArea.find((permanent) => permanent.stack.length >= 2)
            .permanentId;
        }, seat);
        await page.evaluate(() => {
          window.aegisReducedReturn = { observed: false };
          new MutationObserver(() => {
            if (document.querySelector("[data-deck-return]")) window.aegisReducedReturn.observed = true;
          }).observe(document.querySelector(".game-board"), { childList: true, subtree: true });
        });
        await page.getByRole("button", { name: "Demo tools", exact: true }).click();
        await page
          .getByRole("menuitem", { name: `Return Digimon to deck: ${seat === 0 ? "your" : "opponent"}`, exact: true })
          .click();
        await page.waitForFunction(
          (id) => !document.querySelector(`.game-battle-row .game-permanent[data-permanent-id="${id}"]`),
          permanentId,
        );
        assert.equal(await page.evaluate(() => window.aegisReducedReturn.observed), false);
        results.push({ width, seat, reduced: true, naturalObserved: false });
        console.log(`${width}px seat ${seat}: reduced-motion return reaches final board with no flight`);
      } finally {
        await page.close();
      }
    }
  }
  await writeFile(
    new URL("supplemental.json", output),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        results,
        note: "Retained sought poses are separate from natural flight captures; reduced-motion cases use the production queue.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
