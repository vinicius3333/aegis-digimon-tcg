#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-particle-light/", import.meta.url);
await mkdir(output, { recursive: true });
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  const browserResults = await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { CardBurst } = await import("/src/game/CardBurst.tsx");
    const { zoneChangeStep } = await import("/src/game/match/steps/zoneChangeStep.ts");
    const { createAnimationQueue } = await import("/src/game/animationQueue.ts");
    const { createPresentationGate } = await import("/src/game/match/presentationGate.ts");
    const results = [];
    function waitUntil(predicate) {
      const deadline = performance.now() + 5000;
      return new Promise((resolve, reject) => {
        function check() {
          if (performance.now() > deadline) return reject(new Error("Queue probe exceeded its visible-clock deadline"));
          if (predicate()) resolve();
          else requestAnimationFrame(check);
        }
        check();
      });
    }
    for (const rate of [1, 2, 4])
      for (const action of ["complete", "cancel", "skip"]) {
        const host = document.createElement("div");
        host.style.cssText = "position:fixed;left:100px;top:100px;width:72px;height:101px";
        document.body.append(host);
        const root = createRoot(host);
        let setBursts,
          state = new Map(),
          handoffClock,
          retiredClock;
        function clockSnapshot() {
          const animation = host.querySelector(".battle-burst__clock")?.getAnimations()[0];
          return animation
            ? {
                age: Number(animation.currentTime) - Number(animation.effect.getTiming().delay),
                state: animation.playState,
              }
            : null;
        }
        function Probe() {
          const [bursts, set] = React.useState(new Map());
          setBursts = (update) =>
            set((previous) => {
              const next = typeof update === "function" ? update(previous) : update;
              if (previous.has("p") && !next.has("p")) retiredClock = clockSnapshot();
              return next;
            });
          state = bursts;
          return React.createElement(
            React.Fragment,
            null,
            ...[...bursts.values()].map((v) =>
              React.createElement(CardBurst, { key: v.key, cueKey: v.key, variant: v.variant, color: v.color }),
            ),
          );
        }
        root.render(React.createElement(Probe));
        await waitUntil(() => setBursts);
        const queue = createAnimationQueue({
          onStep: (event) => {
            if (event.step.track === "burst-p" && event.phase === "finished") handoffClock = clockSnapshot();
          },
        });
        queue.setRate(rate);
        const landed = createPresentationGate(),
          revealed = createPresentationGate(),
          start = performance.now();
        queue.enqueue(
          zoneChangeStep({
            queue,
            presentationBatchRef: { current: undefined },
            enqueuePhaseOrderRef: { current: undefined },
            setPendingPermanentIds: () => {},
            setZoneShowcase: () => {},
            setPermanentBursts: setBursts,
            key: 990,
            showcase: null,
            burst: { key: 990, permanentId: "p", variant: "play", color: "Red" },
            presentation: { landed, revealed },
          }),
        );
        await waitUntil(() => handoffClock);
        const handoff = {
          ms: performance.now() - start,
          css: handoffClock,
          landed: landed.open,
          light: state.has("p"),
          arrivalPending: queue.hasPendingStep((step) => step.track === "burst-p"),
          lightPending: queue.hasPendingStep((step) => step.track === "arrivalLight-990"),
        };
        if (action === "cancel") queue.clear();
        if (action === "skip") queue.skip();
        await queue.idle();
        await new Promise(requestAnimationFrame);
        results.push({
          rate,
          action,
          handoff,
          retiredClock,
          cleared: state.size === 0,
          canvasGone: !host.querySelector("canvas"),
          duration: performance.now() - start,
        });
        root.unmount();
        host.remove();
      }
    return results;
  });
  for (const result of browserResults) {
    assert.ok(result.handoff.css.age >= 200 - 1e-9, JSON.stringify(result));
    assert.ok(
      result.handoff.landed && result.handoff.light && !result.handoff.arrivalPending && result.handoff.lightPending,
      JSON.stringify(result),
    );
    assert.ok(result.cleared && result.canvasGone, JSON.stringify(result));
    if (result.action === "complete") {
      assert.ok(result.retiredClock.age >= 1150, JSON.stringify(result));
      assert.equal(result.retiredClock.state, "finished");
    }
  }
  const report = {
    scope:
      "Production CardBurst and zoneChangeStep with real queue, synthetic72x101 host, natural CSS clocks; no seeking or source/camera claim. Handoff tolerance1e-9ms accounts only for binary CSS currentTime rounding.",
    results: browserResults,
  };
  await writeFile(new URL("queue.json", output), JSON.stringify(report, null, 2) + "\n");
  console.log("Particle queue checks passed; artifact:", new URL("queue.json", output).pathname);
} finally {
  await browser.close();
}
