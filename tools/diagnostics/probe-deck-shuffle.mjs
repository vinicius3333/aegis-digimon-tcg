#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-deck-shuffle/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 1440])
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
        for (const side of ["your", "opponent"])
          for (const deck of ["deck", "egg deck"]) {
            const selector = `.game-utility-slot--${side === "your" ? "you" : "opp"}-${deck === "deck" ? "deck" : "eggs"} .game-pile`;
            await page.locator(selector).waitFor();
            await page.locator(selector).evaluate(async (pile) => {
              await Promise.all([...pile.querySelectorAll("img")].map((image) => image.decode()));
            });
            await page.evaluate((query) => {
              const pile = document.querySelector(query);
              const badge = pile.querySelector(".game-pile__top span");
              const capture = (window.aegisShuffle = {
                before: {
                  rect: pile.getBoundingClientRect().toJSON(),
                  count: badge?.textContent,
                  badge: badge?.getBoundingClientRect().toJSON(),
                },
                rows: [],
                complete: false,
              });
              let active = false;
              function sample() {
                const shuffling = pile.classList.contains("game-pile--riffling");
                if (shuffling) active = true;
                if (active && !shuffling) {
                  capture.complete = true;
                  capture.after = {
                    rect: pile.getBoundingClientRect().toJSON(),
                    count: badge?.textContent,
                    badge: badge?.getBoundingClientRect().toJSON(),
                    clones: pile.querySelectorAll(".game-pile__shuffle-face").length,
                    visibility: getComputedStyle(pile.querySelector(".game-pile__top img")).visibility,
                  };
                  return;
                }
                if (shuffling)
                  capture.rows.push({
                    rect: pile.getBoundingClientRect().toJSON(),
                    count: badge?.textContent,
                    badge: badge?.getBoundingClientRect().toJSON(),
                    overflow: document.documentElement.scrollWidth > innerWidth,
                    faces: [...pile.querySelectorAll(".game-pile__layer, .game-pile__shuffle-face")]
                      .filter((face) => getComputedStyle(face).display !== "none")
                      .map((face) => {
                        const animation = face.getAnimations()[0];
                        const style = getComputedStyle(face),
                          rect = face.getBoundingClientRect();
                        return {
                          time: animation?.currentTime,
                          duration: animation?.effect.getTiming().duration,
                          y: style.translate.split(" ")[1] ?? "0px",
                          x: style.translate.split(" ")[0],
                          rotate: style.rotate,
                          sign: Number(style.getPropertyValue("--deck-riffle-sign")),
                          height: rect.height,
                          src: face.querySelector("img")?.currentSrc,
                          decoded: [...face.querySelectorAll("img")].every(
                            (image) => image.complete && image.naturalWidth > 0,
                          ),
                        };
                      }),
                  });
                requestAnimationFrame(sample);
              }
              requestAnimationFrame(sample);
            }, selector);
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page.getByRole("menuitem", { name: `Preview shuffle: ${side} ${deck}`, exact: true }).click();
            await page.waitForFunction(() => window.aegisShuffle.complete);
            const capture = await page.evaluate(() => window.aegisShuffle);
            await writeFile(
              new URL("last-case.json", output),
              JSON.stringify({ width, speed, side, deck, capture }, null, 2),
            );
            if (
              errors.length ||
              capture.rows.length < 3 ||
              capture.after.clones ||
              capture.after.visibility !== "visible"
            )
              throw new Error("Shuffle lost its card faces or cleanup");
            for (const pose of [...capture.rows, capture.after]) {
              if (
                pose.overflow ||
                pose.count !== capture.before.count ||
                ["x", "y", "width", "height"].some(
                  (key) => Math.abs(pose.rect[key] - capture.before.rect[key]) > 0.01,
                ) ||
                ["x", "y", "width", "height"].some(
                  (key) => Math.abs(pose.badge[key] - capture.before.badge[key]) > 0.01,
                )
              )
                throw new Error("Shuffle moved the physical pile or its counter");
            }
            let maximumAge = 0;
            for (const row of capture.rows)
              for (const face of row.faces) {
                const age = face.time / face.duration;
                maximumAge = Math.max(maximumAge, age);
                const beat = Math.min(5, Math.floor(age * 6)),
                  local = Math.min(1, age * 6 - beat);
                const endpoints = [0, 0, 1, 0, -1, 0, 1];
                const expected =
                  (face.sign *
                    (endpoints[beat] + (endpoints[beat + 1] - endpoints[beat]) * (1 - (1 - local) ** 2)) *
                    3) /
                  14;
                const y = Number.parseFloat(face.y) / (face.y.endsWith("%") ? 100 : face.height);
                if (
                  !face.decoded ||
                  Number.parseFloat(face.x) !== 0 ||
                  !["none", "0deg"].includes(face.rotate) ||
                  Math.abs(y - expected) > 0.0003
                )
                  throw new Error("Shuffle differs from the three alternating 30ms OutQuad pairs");
              }
            if (maximumAge < 1)
              throw new Error(`Shuffle owner detached at ${(maximumAge * 100).toFixed(1)}% of its painted clock`);
            results.push({ width, speed, side, deck, capture });
            console.log(
              `${width}px ${speed} ${side} ${deck}: alternating strokes, stationary count and complete clock passed`,
            );
          }
      } finally {
        await page.close();
      }
    }
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.addInitScript(() => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.effect-speed", "normal");
      });
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page.getByRole("menuitem", { name: "Preview shuffle: your deck", exact: true }).click();
      await page.locator(".game-pile__shuffle-face").waitFor();
      await page.evaluate(() => {
        const face = document.querySelector(".game-pile__shuffle-face");
        window.aegisShuffleReplacement = {
          face,
          animation: face.getAnimations()[0],
          key: face.parentElement.dataset.deckRiffleKey,
          rows: [],
          complete: false,
        };
      });
      await page.waitForTimeout(35);
      await page.getByRole("button", { name: "Demo tools", exact: true }).evaluate((button) => button.click());
      await page.getByRole("menuitem", { name: "Preview shuffle: your deck", exact: true }).evaluate((button) => {
        if (!window.aegisShuffleReplacement.face.isConnected)
          throw new Error("The first shuffle ended before replacement");
        button.click();
      });
      await page.waitForFunction(
        () =>
          document.querySelector(".game-pile__shuffle-face")?.parentElement.dataset.deckRiffleKey !==
          window.aegisShuffleReplacement.key,
      );
      await page.evaluate(() => {
        const capture = window.aegisShuffleReplacement;
        const face = document.querySelector(".game-pile__shuffle-face");
        capture.remounted = face !== capture.face;
        capture.newAnimation = face.getAnimations()[0] !== capture.animation;
        function sample() {
          if (!face.isConnected) {
            capture.complete = true;
            return;
          }
          const animation = face.getAnimations()[0];
          capture.rows.push({
            time: animation.currentTime,
            duration: animation.effect.getTiming().duration,
            key: face.parentElement.dataset.deckRiffleKey,
          });
          requestAnimationFrame(sample);
        }
        sample();
      });
      await page.waitForFunction(() => window.aegisShuffleReplacement.complete);
      const capture = await page.evaluate(() => {
        const { remounted, newAnimation, key, rows } = window.aegisShuffleReplacement;
        return { remounted, newAnimation, key, rows };
      });
      if (
        !capture.remounted ||
        !capture.newAnimation ||
        capture.rows[0].time > 35 ||
        capture.rows.some((row) => row.key === capture.key) ||
        Math.max(...capture.rows.map((row) => row.time / row.duration)) < 1
      )
        throw new Error("An overlapping shuffle borrowed or lost the old occurrence's clock");
      results.push({ width, replacement: true, capture });
      console.log(`${width}px: overlapping shuffle remounts its own complete three-pair clock`);
    } finally {
      await page.close();
    }
  }
  for (const width of [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      for (const side of ["your", "opponent"])
        for (const deck of ["deck", "egg deck"]) {
          const before = await page.locator(".game-pile__top").allTextContents();
          await page.evaluate(() => {
            window.aegisReducedShuffle = { moving: false, stopped: false };
            function sample() {
              window.aegisReducedShuffle.moving ||= !!document.querySelector(
                ".game-pile--riffling, .game-pile__shuffle-face",
              );
              if (!window.aegisReducedShuffle.stopped) requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          });
          await page.getByRole("button", { name: "Demo tools", exact: true }).click();
          await page.getByRole("menuitem", { name: `Preview shuffle: ${side} ${deck}`, exact: true }).click();
          await page.waitForTimeout(250);
          const moving = await page.evaluate(() => {
            window.aegisReducedShuffle.stopped = true;
            return window.aegisReducedShuffle.moving;
          });
          const after = await page.locator(".game-pile__top").allTextContents();
          if (errors.length || moving || JSON.stringify(before) !== JSON.stringify(after))
            throw new Error("Reduced queue changed or animated the deck");
          results.push({ width, reduced: true, side, deck });
          console.log(`${width}px reduced ${side} ${deck}: resting sleeves/counts retained`);
        }
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        results,
        note: "Natural Arena event fixtures; no CSS clock sought. Authored normalized motion, not a measured reference camera/trajectory.",
      },
      null,
      2,
    ),
  );
  console.log(`${results.length} natural shuffle/reduced-motion cases passed`);
} finally {
  await browser.close();
}
