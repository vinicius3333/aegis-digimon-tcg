#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-draw-presentations/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

function expectedPose(clock, side, width, height, inward) {
  const exit = side === "you" ? 150 : 110;
  const out = (time, duration) => {
    const t = Math.max(0, Math.min(1, time / duration));
    return 1 - (1 - t) ** 2;
  };
  if (clock < 60) {
    const p = out(clock, 60);
    return {
      sx: 4 / 9 + (5 / 9) * p,
      sy: 4 / 9 + (5 / 9) * p,
      angle: 60 * (1 - p),
      x: -inward * (4 / 3) * width * (1 - p),
      y: side === "you" ? (-40 / 63) * height * (1 - p) : 0,
    };
  }
  if (clock < exit) return { sx: 1, sy: 1, angle: 0, x: 0, y: 0 };
  if (clock < exit + 70) {
    const p = out(clock - exit, 70);
    return { sx: 1 + (2 / 15 - 1) * p, sy: 1 + (28 / 9 - 1) * p, angle: 0, x: 0, y: 0 };
  }
  const distance = side === "you" ? -250 / 63 : -190 / 63;
  return { sx: 2 / 15, sy: 28 / 9, angle: 0, x: 0, y: distance * height * out(clock - exit - 70, 70) };
}

async function captureControlledPoses(width, side) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  try {
    await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
    await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
    await page.getByRole("button", { name: "Demo tools", exact: true }).click();
    await page
      .getByRole("menuitem", { name: side === "you" ? "Draw your card" : "Draw opponent card", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page.locator('[data-draw-ready="true"]').waitFor();
    await page.evaluate(() => {
      const root = document.querySelector("[data-draw-presentation-key]");
      window.aegisControlledDraw = { root, animations: root.getAnimations({ subtree: true }) };
      for (const animation of window.aegisControlledDraw.animations) animation.pause();
    });
    const result = [];
    // Deliberately sought poses, separate from the natural playback proof above.
    for (const clock of side === "you"
      ? [0, 30, 60, 90, 120, 150, 160, 185, 220, 260]
      : [0, 30, 60, 100, 110, 145, 180, 220]) {
      const pose = await page.evaluate((time) => {
        const { root, animations } = window.aegisControlledDraw;
        if (!root.isConnected) throw new Error("Controlled draw was discarded before its pose could be inspected");
        for (const animation of animations) animation.currentTime = time;
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(root.querySelector(".game-draw-presentation__face")).transform,
        );
        return { clock: time, a: matrix.a, b: matrix.b, c: matrix.c, d: matrix.d, x: matrix.e, y: matrix.f };
      }, clock);
      await page.screenshot({ path: new URL(`pose-${width}-${side}-${clock}.png`, output).pathname });
      result.push(pose);
    }
    await page.evaluate(() => {
      for (const animation of window.aegisControlledDraw.animations) animation.play();
    });
    await page.locator("[data-draw-presentation-key]").waitFor({ state: "detached" });
    console.log(`${width}-${side}: ${result.length} separate sought visual poses captured`);
    return { width, side, poses: result };
  } finally {
    await page.close();
  }
}

try {
  const cases = [];
  for (const width of [320, 768, 1024, 1440])
    for (const side of ["you", "opp"]) cases.push({ width, side, count: 1, reduced: false });
  for (const width of [320, 1440])
    for (const side of ["you", "opp"]) {
      cases.push({ width, side, count: 2, reduced: false });
      cases.push({ width, side, count: 1, reduced: true });
    }
  for (const fixture of cases) {
    const { width, side, count, reduced } = fixture;
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
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate((input) => {
        const counter = (prefix, counterSide) => {
          const nodes = [...document.querySelectorAll(`button[aria-label^="${prefix}:"]`)];
          return Number(nodes[counterSide === "you" ? 1 : 0].getAttribute("aria-label").match(/\d+/)[0]);
        };
        const capture = (window.aegisDrawPresentationCapture = {
          baseline: { hand: counter("Hand", input.side), deck: counter("Deck", input.side) },
          samples: [],
          done: false,
        });
        const start = performance.now();
        function sample(now) {
          const roots = [...document.querySelectorAll("[data-draw-presentation-key]")];
          const hand = counter("Hand", input.side);
          const deck = counter("Deck", input.side);
          const presentations = roots.map((root) => {
            const face = root.querySelector(".game-draw-presentation__face");
            const style = getComputedStyle(face);
            const matrix = new DOMMatrixReadOnly(style.transform);
            const animation = face
              .getAnimations()
              .find((candidate) => candidate.animationName?.startsWith("battle-draw-presentation"));
            const wash = face.querySelector(".game-draw-presentation__wash");
            const image = face.querySelector("img");
            const rays = root.querySelector(".game-draw-light__rays");
            const lightAnimation = rays?.getAnimations()[0];
            const glow = root.querySelector(".game-draw-light__glow");
            const glowAnimation = glow?.getAnimations()[0];
            const bounds = root.getBoundingClientRect();
            const pile = document
              .querySelector(`.game-utility-slot--${root.dataset.side === "you" ? "you" : "opp"}-deck .game-pile`)
              .getBoundingClientRect();
            return {
              key: Number(root.dataset.drawPresentationKey),
              side: root.dataset.side,
              id: root.dataset.drawInstanceId,
              ready: root.dataset.drawReady === "true",
              clock: animation?.currentTime,
              duration: animation?.effect.getComputedTiming().duration,
              width: parseFloat(getComputedStyle(root).width),
              height: parseFloat(getComputedStyle(root).height),
              deckOffset: {
                x: (bounds.left + bounds.width / 2 - pile.left - pile.width / 2) / bounds.width,
                y: (bounds.top + bounds.height / 2 - pile.top - pile.height / 2) / bounds.height,
              },
              inward: parseFloat(root.style.getPropertyValue("--draw-entry-x")) < 0 ? 1 : -1,
              sx: Math.hypot(matrix.a, matrix.b),
              sy: Math.hypot(matrix.c, matrix.d),
              angle: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
              x: matrix.e,
              y: matrix.f,
              wash: Number(getComputedStyle(wash).opacity),
              washColor: getComputedStyle(wash).backgroundColor,
              visibility: getComputedStyle(root).visibility,
              image: image?.src,
              decoded: !image || (image.complete && image.naturalWidth > 0),
              rings: [...root.querySelectorAll(".battle-burst__ring")].filter(
                (element) => getComputedStyle(element).display !== "none",
              ).length,
              light: rays
                ? {
                    opacity: Number(getComputedStyle(rays).opacity),
                    duration: lightAnimation?.effect.getComputedTiming().duration,
                    delay: lightAnimation?.effect.getComputedTiming().delay,
                    clock: lightAnimation?.currentTime,
                    state: lightAnimation?.playState,
                    bounds: { width: rays.getBoundingClientRect().width, height: rays.getBoundingClientRect().height },
                  }
                : null,
              glow: glow
                ? {
                    opacity: Number(getComputedStyle(glow).opacity),
                    duration: glowAnimation?.effect.getComputedTiming().duration,
                    delay: glowAnimation?.effect.getComputedTiming().delay,
                    clock: glowAnimation?.currentTime,
                    state: glowAnimation?.playState,
                  }
                : null,
            };
          });
          capture.samples.push({
            elapsed: now - start,
            hand,
            deck,
            presentations,
            ownCount: document.querySelector('[data-testid="hand"]').querySelectorAll("[data-hand-instance-id]").length,
            opponentCount: Number(
              document.querySelector('[data-testid="opponent-hand"]').getAttribute("aria-label").match(/\d+/)[0],
            ),
            overflow: document.documentElement.scrollWidth > innerWidth,
          });
          const complete =
            hand === capture.baseline.hand + input.count &&
            deck === capture.baseline.deck - input.count &&
            roots.length === 0;
          capture.done = complete && now - start > 1200;
          if (!capture.done && now - start < 7000) requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      }, fixture);
      await page.getByRole("button", { name: "Demo tools", exact: true }).click();
      const action = page.getByRole("menuitem", {
        name: side === "you" ? "Draw your card" : "Draw opponent card",
        exact: true,
      });
      if (count === 1) await action.click();
      else
        await action.evaluate((button) => {
          button.click();
          button.click();
        });
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => window.aegisDrawPresentationCapture.done);
      const capture = await page.evaluate(() => window.aegisDrawPresentationCapture);
      const name = `${width}-${side}-${count}${reduced ? "-reduced" : ""}`;
      await writeFile(new URL(`${name}.json`, output), JSON.stringify(capture, null, 2) + "\n");
      if (errors.length) throw new Error(errors.join("\n"));
      if (
        capture.samples.some(
          (sample) =>
            sample.overflow ||
            sample.hand + sample.deck !== capture.baseline.hand + capture.baseline.deck ||
            (side === "you" ? sample.ownCount : sample.opponentCount) !== sample.hand,
        )
      )
        throw new Error(`${name}: hand, deck or physical membership diverged`);
      const poses = capture.samples.flatMap((sample) =>
        sample.presentations.map((pose) => ({ ...pose, hand: sample.hand, deck: sample.deck })),
      );
      if (reduced) {
        if (poses.length) throw new Error(`${name}: reduced motion retained temporary draw presentations`);
      } else {
        const firstPresentation = capture.samples.findIndex((sample) => sample.presentations.length > 0);
        if (
          firstPresentation < 0 ||
          capture.samples
            .slice(0, firstPresentation)
            .some((sample) => sample.hand !== capture.baseline.hand || sample.deck !== capture.baseline.deck)
        )
          throw new Error(`${name}: hand or deck changed before its first presentation was mounted`);
        const keys = [...new Set(poses.map((pose) => pose.key))];
        if (keys.length !== count || capture.samples.some((sample) => sample.presentations.length > 1))
          throw new Error(`${name}: draws did not present one physical occurrence at a time`);
        for (const [index, key] of keys.entries()) {
          const sequence = poses.filter((pose) => pose.key === key);
          const visible = sequence.filter((pose) => pose.ready && pose.clock !== undefined);
          if (
            visible.length < 10 ||
            !visible.some((pose) => pose.clock < 60) ||
            !visible.some((pose) => pose.clock > (side === "you" ? 220 : 180))
          )
            throw new Error(`${name}: insufficient natural movement/hold/exit samples`);
          if (
            side === "you" &&
            (!visible.some((pose) => pose.light?.opacity > 0.8) || !visible.some((pose) => pose.glow?.opacity > 0.6))
          )
            throw new Error(`${name}: natural playback never painted the beam or glow peak`);
          for (const pose of visible) {
            const expected = expectedPose(pose.clock, side, pose.width, pose.height, pose.inward);
            if (
              Math.abs(pose.deckOffset.x - pose.inward * 0.4) > 0.002 ||
              Math.abs(pose.deckOffset.y - (side === "you" ? 0.06 : 0)) > 0.002
            )
              throw new Error(`${name}: the presentation lost its measured deck-relative resting anchor`);
            for (const property of ["sx", "sy", "angle", "x", "y"])
              if (Math.abs(pose[property] - expected[property]) > (property === "x" || property === "y" ? 0.03 : 0.001))
                throw new Error(
                  `${name}: ${property} deviates from the authored clock at ${pose.clock}: ${pose[property]} / ${expected[property]}`,
                );
            if (
              pose.duration !== (side === "you" ? 290 : 250) ||
              !pose.decoded ||
              pose.rings ||
              pose.visibility !== "visible"
            )
              throw new Error(`${name}: incorrect face readiness, lifetime or draw light`);
            const expectedWash = Math.max(0, Math.min(1, (pose.clock - (side === "you" ? 150 : 110)) / 35));
            if (Math.abs(pose.wash - expectedWash) > 0.001 || pose.washColor !== "rgb(255, 255, 255)")
              throw new Error(`${name}: artwork did not become a bright streak at the narrowing boundary`);
            if (side === "you") {
              if (
                !pose.light ||
                pose.light.duration !== 100 ||
                pose.light.delay !== 60 ||
                Math.abs(pose.light.bounds.width / pose.width - 16) > 0.001
              )
                throw new Error(`${name}: incorrect directional flash size or timing`);
              if (
                !pose.glow ||
                pose.glow.duration !== 190 ||
                pose.glow.delay !== 60 ||
                Math.abs(pose.light.clock - Math.min(pose.clock, 160)) > 1 ||
                Math.abs(pose.glow.clock - Math.min(pose.clock, 250)) > 1
              )
                throw new Error(`${name}: light clocks diverged from the decoded face`);
              if ((pose.light.clock <= 60 || pose.light.clock >= 160) && pose.light.opacity > 0.001)
                throw new Error(`${name}: draw rays outlived their measured flash interval`);
              if ((pose.glow.clock <= 60 || pose.glow.clock >= 250) && pose.glow.opacity > 0.001)
                throw new Error(`${name}: halo outlived its presentation accent`);
            } else if (pose.light || pose.glow) throw new Error(`${name}: opaque opponent draw acquired viewer light`);
            const handoff = side === "you" ? 210 : 170;
            // Handoff may wait one React commit after the exact painted boundary.
            if (pose.clock < handoff && pose.hand !== capture.baseline.hand + index)
              throw new Error(`${name}: hand grew before the presentation handed over its card`);
            if (pose.clock >= handoff + 40 && pose.hand !== capture.baseline.hand + index + 1)
              throw new Error(`${name}: hand did not arrive during the presentation's final tail`);
            if (side === "opp" && pose.id !== undefined)
              throw new Error(`${name}: opaque watcher exposed an opponent identity`);
          }
          if (
            sequence.some(
              (pose) =>
                !pose.ready &&
                (pose.visibility !== "hidden" ||
                  pose.clock !== undefined ||
                  (pose.light && (pose.light.state !== "paused" || pose.light.opacity !== 0)) ||
                  (pose.glow && (pose.glow.state !== "paused" || pose.glow.opacity !== 0))),
            )
          )
            throw new Error(`${name}: temporary face began before decoding`);
        }
      }
      await page.screenshot({ path: new URL(`${name}.png`, output).pathname });
      results.push({ fixture, capture });
      console.log(`${name}: natural draw choreography, membership and deck counts passed`);
    } finally {
      await page.close();
    }
  }
  const controlled = [];
  for (const width of [320, 1440])
    for (const side of ["you", "opp"]) controlled.push(await captureControlledPoses(width, side));
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        note: "The results section contains natural visual Arena fixtures without seek or simulated clocks. The controlled section contains separately sought visual poses. Authored timing/curve checks and Aegis geometry are separate from primary camera projection and engine legality.",
        results,
        controlled,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
