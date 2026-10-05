#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";

// Isolated production-hook/queue probe, with natural browser clocks and a synthetic
// face. This checks playback ownership and handoff, not actual Arena geometry/art.
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  const playbackResults = await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { useBreedingTransferOrigin, useBreedingTransferOrigins, runBreedingTransfer } =
      await import("/src/game/breedingTransfer.ts");
    const { createAnimationQueue } = await import("/src/game/animationQueue.ts");
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const results = [];
    for (const mode of ["stepOnce", "pauseResume", "cancel", "skip"]) {
      const host = document.createElement("main");
      host.className = "aegis-arena";
      host.style.cssText = "position:fixed;inset:0";
      document.body.prepend(host);
      const root = createRoot(host);
      let move;
      let release;
      function Probe() {
        const [moved, setMoved] = React.useState(false);
        const [held, setHeld] = React.useState(true);
        move = () => setMoved(true);
        release = () => setHeld(false);
        const board = React.useRef(null);
        useBreedingTransferOrigins(board);
        const ref = useBreedingTransferOrigin("probe");
        const face = React.createElement(
          "div",
          { className: "game-card-enter game-card-enter--quiet" },
          React.createElement("div", {
            "data-state": "ready",
            style: { width: moved ? 80 : 100, height: moved ? 112 : 140, background: "red" },
          }),
        );
        return React.createElement(
          "div",
          { ref: board, className: "game-board", style: { position: "relative", width: 700, height: 500 } },
          moved
            ? React.createElement(
                "div",
                { className: "game-battle-row", style: { position: "absolute", left: 400, top: 50 } },
                React.createElement(
                  "div",
                  {
                    className: "game-permanent",
                    "data-permanent-id": "probe",
                    style: { visibility: held ? "hidden" : "visible" },
                  },
                  face,
                ),
              )
            : React.createElement(
                "div",
                {
                  className: "game-breeding-slot",
                  "data-permanent-id": "probe",
                  style: { position: "absolute", left: 30, top: 200 },
                },
                React.createElement("div", { ref, className: "game-permanent", "data-permanent-id": "probe" }, face),
              ),
        );
      }
      const queue = createAnimationQueue();
      try {
        root.render(React.createElement(Probe));
        for (let index = 0; index < 4; index++) await frame();
        move();
        for (let index = 0; index < 2; index++) await frame();
        let completed = false;
        let handed = 0;
        if (mode === "stepOnce") queue.pause();
        queue.enqueue({
          id: "probe",
          track: "probe",
          async run(context) {
            try {
              await runBreedingTransfer("probe", queue, context, () => {
                handed++;
                release();
              });
            } finally {
              release();
              completed = true;
            }
          },
        });
        await frame();
        const stepped = mode === "stepOnce" ? queue.stepOnce() : undefined;
        const samples = [];
        const pausedAges = [];
        let acted = false;
        for (let index = 0; index < 50; index++) {
          await frame();
          let clone = host.querySelector("[data-breeding-transfer]");
          let animation = clone?.getAnimations()[0];
          if (!acted && animation?.currentTime >= 49) {
            acted = true;
            if (mode === "pauseResume") {
              queue.pause();
              for (let pausedFrame = 0; pausedFrame < 5; pausedFrame++) {
                await frame();
                pausedAges.push(animation.currentTime);
              }
              queue.resume();
            } else if (mode === "cancel") queue.clear();
            else if (mode === "skip") queue.skip();
          }
          clone = host.querySelector("[data-breeding-transfer]");
          animation = clone?.getAnimations()[0];
          const target = host.querySelector(".game-battle-row .game-permanent");
          samples.push({
            age: animation?.currentTime ?? null,
            state: animation?.playState ?? null,
            targetVisibility: getComputedStyle(target).visibility,
            handed,
            completed,
          });
          if (completed && !clone) break;
        }
        results.push({ mode, stepped, acted, pausedAges, samples });
      } finally {
        queue.clear();
        root.unmount();
        host.remove();
      }
    }
    return results;
  });
  assert.deepEqual(errors, [], "unexpected browser errors");
  assert.equal(playbackResults.length, 4);
  for (const result of playbackResults) {
    const { mode, samples } = result;
    const last = samples.at(-1);
    assert.equal(last?.completed, true, `${mode}: execution did not finish`);
    assert.equal(last.age, null, `${mode}: clone survived cleanup`);
    assert.equal(last.targetVisibility, "visible", `${mode}: destination stayed hidden`);
    assert.equal(last.handed, 1, `${mode}: handoff must run exactly once`);
    assert.ok(
      samples.every((sample) => sample.age !== null || sample.targetVisibility === "visible"),
      `${mode}: invisible gap`,
    );
    if (mode === "stepOnce" || mode === "pauseResume") {
      assert.ok(
        samples.some((sample) => sample.age === 200 && sample.state === "finished"),
        `${mode}: no completed painted clock`,
      );
      assert.ok(
        samples.some((sample) => sample.age === 200 && sample.targetVisibility === "visible"),
        `${mode}: clone did not bridge the React commit`,
      );
    }
    if (mode === "stepOnce") assert.equal(result.stepped, true);
    else assert.equal(result.acted, true, `${mode}: control was never exercised`);
    if (mode === "pauseResume") {
      assert.equal(result.pausedAges.length, 5);
      assert.ok(Math.max(...result.pausedAges) - Math.min(...result.pausedAges) < 0.01, "pause clock advanced");
    }
    if (mode === "cancel" || mode === "skip") {
      assert.ok(Math.max(...samples.map((sample) => sample.age ?? 0)) < 200, `${mode}: interrupted too late`);
    }
  }
  console.log(JSON.stringify({ cases: playbackResults.length, results: playbackResults }, null, 2));
} finally {
  await browser.close();
}
