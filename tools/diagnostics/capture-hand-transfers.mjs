#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({
  options: { base: { type: "string", default: "http://localhost:5174" }, only: { type: "string" } },
});
const output = new URL("../../.local/motion-reference/aegis-hand-transfers/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const cases = [];
for (const width of [320, 1440]) {
  for (const side of ["you", "opp"]) {
    for (const revealed of [false, true]) cases.push({ width, side, revealed, reduced: false, late: false });
    cases.push({ width, side, revealed: false, reduced: true, late: false });
  }
  cases.push({ width, side: "you", revealed: false, reduced: false, late: true });
}
try {
  for (const fixture of cases) {
    const { width, side, revealed, reduced } = fixture;
    const name = `${width}-${side}-${revealed ? "revealed" : "private"}${reduced ? "-reduced" : ""}${fixture.late ? "-late" : ""}`;
    if (values.only && name !== values.only) continue;
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
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
      });
      await page.evaluate((input) => {
        const counter = (prefix) =>
          Number(
            [...document.querySelectorAll(`button[aria-label^="${prefix}:"]`)][input.side === "you" ? 1 : 0]
              .getAttribute("aria-label")
              .match(/\d+/)[0],
          );
        const old = new Set(
          [...document.querySelectorAll("[data-hand-instance-id]")].map((root) => root.dataset.handInstanceId),
        );
        const oldOpponent = document.querySelectorAll("[data-opponent-hand-slot]").length;
        if (input.late) {
          const decode = HTMLImageElement.prototype.decode;
          HTMLImageElement.prototype.decode = async function () {
            await new Promise((resolve) => setTimeout(resolve, 500));
            return decode.call(this);
          };
        }
        const capture = (window.aegisHandTransferCapture = {
          baseline: { hand: counter("Hand"), deck: counter("Deck") },
          samples: [],
          done: false,
        });
        const start = performance.now();
        function sample(now) {
          const root =
            input.side === "you"
              ? [...document.querySelectorAll("[data-hand-instance-id]")].find(
                  (card) => !old.has(card.dataset.handInstanceId),
                )
              : document.querySelector(`[data-opponent-hand-slot="${oldOpponent}"]`);
          const style = root ? getComputedStyle(root) : undefined;
          const animation = root
            ?.getAnimations()
            .find((entry) => ["battle-hand-draw", "battle-opponent-hand-entry"].includes(entry.animationName));
          const image = root?.querySelector("img");
          capture.samples.push({
            elapsed: now - start,
            hand: counter("Hand"),
            deck: counter("Deck"),
            drawFaces: document.querySelectorAll("[data-draw-presentation-key], .game-draw-flight").length,
            showcase: !!document.querySelector('[data-testid="reveal-showcase"]'),
            overflow: document.documentElement.scrollWidth > innerWidth,
            face: root
              ? {
                  visible: style.visibility !== "hidden",
                  clock: animation?.currentTime ?? null,
                  duration: animation?.effect.getComputedTiming().duration ?? null,
                  y: parseFloat(style.translate.split(" ")[1] ?? "0"),
                  opacity: Number(style.opacity),
                  width: parseFloat(style.width),
                  height: parseFloat(style.height),
                  image: image ? { complete: image.complete, width: image.naturalWidth } : null,
                  identity: root.dataset.handInstanceId ?? null,
                }
              : null,
          });
          capture.done =
            counter("Hand") === capture.baseline.hand + 1 &&
            now - start > 2200 &&
            root &&
            style.visibility !== "hidden" &&
            (!animation || Number(animation.currentTime) >= 80);
          if (!capture.done && now - start < 7500) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, fixture);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      await page
        .getByRole("menuitem", {
          name: `${revealed ? "Add revealed card" : "Search card"} ${side === "you" ? "to your hand" : "to opponent hand"}`,
          exact: true,
        })
        .click();
      await page.waitForFunction(() => window.aegisHandTransferCapture.done, { timeout: 9000 });
      const capture = await page.evaluate(() => window.aegisHandTransferCapture);
      await writeFile(new URL(`${name}.json`, output), JSON.stringify({ fixture, ...capture }, null, 2));
      if (errors.length) throw new Error(errors.join("\n"));
      if (capture.samples.some((sample) => sample.drawFaces || sample.overflow))
        throw new Error("Transfer replayed a deck draw or overflowed the page");
      if (side === "opp" && revealed && !reduced) {
        const shown = capture.samples.filter((sample) => sample.showcase);
        if (
          !shown.length ||
          shown.some(
            (sample) => sample.face || sample.hand !== capture.baseline.hand || sample.deck !== capture.baseline.deck,
          )
        )
          throw new Error("Revealed transfer changed hand/deck before its matching showcase completed");
      }
      const faces = capture.samples.filter((sample) => sample.face?.visible);
      if (!faces.length) throw new Error("No visible hand addition was painted");
      if (faces.at(-1).hand !== capture.baseline.hand + 1 || faces.at(-1).deck !== capture.baseline.deck - 1)
        throw new Error("Final counts do not conserve the search");
      if (side === "opp" && faces.some((sample) => sample.face.identity !== null))
        throw new Error("Opaque opponent slots exposed identity");
      if (!reduced) {
        const moving = faces.filter(
          (sample) => typeof sample.face.clock === "number" && sample.face.clock > 0 && sample.face.clock < 80,
        );
        if (moving.length < 2 || faces[0].face.clock > 35)
          throw new Error("Natural entry was not observed from its first painted clock");
        for (const sample of moving) {
          const { clock, y, duration } = sample.face;
          const t = clock / 80;
          const back = 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2;
          const expected = 50 * (1 - back);
          if (duration !== 80 || Math.abs(y - expected) > 0.025)
            throw new Error(`Wrong physical hand entry: ${JSON.stringify(sample.face)}`);
          if (sample.face.opacity !== 1 || (side === "you" && !sample.face.image?.width))
            throw new Error("The short entry preceded decoded art or faded its face");
        }
        if (
          fixture.late &&
          !capture.samples.some((sample) => sample.face && !sample.face.visible && sample.elapsed > 300)
        )
          throw new Error("Late decode did not preserve a hidden reserved slot");
      } else if (faces.some((sample) => sample.face.clock !== null || Math.abs(sample.face.y) > 0.01))
        throw new Error("Reduced motion retained hand movement");
      await page.screenshot({ path: new URL(`${name}.png`, output).pathname });
      await writeFile(new URL(`${name}.json`, output), JSON.stringify({ fixture, ...capture }, null, 2));
      results.push({
        fixture,
        movingSamples: faces.filter((sample) => sample.face.clock > 0 && sample.face.clock < 80).length,
      });
      console.log(`${name}: natural hand entry and no repeated deck presentation passed`);
    } finally {
      await page.close();
    }
  }
  await writeFile(new URL("summary.json", output), JSON.stringify(results, null, 2));
  console.log(`${results.length} natural transfer cases passed; clocks were never sought`);
} finally {
  await browser.close();
}
