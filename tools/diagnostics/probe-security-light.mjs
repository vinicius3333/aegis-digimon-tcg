#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    "lifecycle-only": { type: "boolean", default: false },
  },
});
const output = new URL("../../.local/motion-reference/aegis-security-light/", import.meta.url);
await mkdir(output, { recursive: true });
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const browser = await chromium.launch();
const results = [];
try {
  for (const width of values["lifecycle-only"] ? [] : [320, 1440])
    for (const setting of ["normal", "fast", "reduced"])
      for (const cause of ["destruction", "attacker"]) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          reducedMotion: setting === "reduced" ? "reduce" : "no-preference",
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.addInitScript((speedSetting) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis.effect-speed", speedSetting === "reduced" ? "normal" : speedSetting);
          }, setting);
          await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
          await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
          if (cause === "destruction") {
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page.getByRole("menuitem", { name: "Automatically preview keywords", exact: true }).click();
            await page.getByRole("button", { name: "Pause after this scene", exact: true }).click();
            await page.getByRole("button", { name: /1\/44 · Blocker/ }).click();
          }
          await page.evaluate(() => {
            const capture = (window.aegisSecurityLight = { rows: [], complete: false });
            let stage, light;
            function sample() {
              stage ??= document.querySelector(".battle-clash:has(.game-card-shatter)");
              light ??= document.querySelector(".battle-independent-light");
              if (light && !light.isConnected) {
                capture.complete = true;
                return;
              }
              if (stage && !stage.isConnected && !light) {
                capture.complete = true;
                return;
              }
              if (light) {
                const clock = light.querySelector(".battle-burst__clock").getAnimations()[0],
                  canvas = light.querySelector("canvas"),
                  pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
                let lit = 0;
                for (let i = 3; i < pixels.length; i += 64) if (pixels[i] > 4) lit++;
                const source = stage?.querySelector(".battle-clash__shatter .battle-burst__clock")?.getAnimations()[0];
                capture.rows.push({
                  age: Number(clock.currentTime) - Number(clock.effect.getTiming().delay),
                  sourceAge: source ? Number(source.currentTime) - Number(source.effect.getTiming().delay) : null,
                  duration: clock.effect.getTiming().duration,
                  lit,
                  stagePresent: Boolean(stage?.isConnected),
                  opacity: Number(getComputedStyle(light).opacity),
                  capacity: canvas.dataset.capacity,
                  emitters: canvas.dataset.emitters,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                });
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          });
          if (cause === "destruction") {
            const select = page.getByRole("combobox", { name: "Choose a keyword" });
            await select.selectOption(
              await select.locator("option").filter({ hasText: "Barrier" }).getAttribute("value"),
            );
          } else {
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page.getByRole("menuitem", { name: "Security battle: your Digimon loses", exact: true }).click();
          }
          if (setting === "normal") {
            await page.waitForFunction(() => {
              const row = window.aegisSecurityLight.rows.at(-1);
              return row?.age >= 650 && !row.stagePresent;
            });
            await page.screenshot({ path: new URL(`${cause}-${width}-tail.png`, output).pathname });
          }
          await page.waitForFunction(() => window.aegisSecurityLight.complete, undefined, { timeout: 20000 });
          const capture = await page.evaluate(() => window.aegisSecurityLight);
          assert.deepEqual(errors, []);
          if (setting === "reduced") assert.equal(capture.rows.length, 0);
          else {
            assert.ok(
              capture.rows.some((row) => row.age < 0),
              "departure delay was lost",
            );
            assert.ok(
              capture.rows.some((row) => row.age >= 900 && row.lit > 0 && !row.stagePresent),
              "light was cut by scene exit",
            );
            assert.ok(capture.rows.at(-1).age >= 1130, "light did not finish its native clock");
            for (const row of capture.rows) {
              assert.equal(row.duration, 1150);
              assert.equal(row.opacity, 1);
              assert.equal(row.overflow, false);
              assert.equal(row.capacity, "305");
              assert.equal(row.emitters, "6");
              // Chromium rounds a script-assigned animation startTime to0.1ms.
              // A newly mounted CSS source can stay pending for its first frame;
              // both canvases are blank then. Once emitting, their clocks agree.
              if (row.stagePresent && row.sourceAge !== null && (row.age >= 0 || row.sourceAge >= 0))
                assert.ok(Math.abs(row.age - row.sourceAge) < 0.2, JSON.stringify(row));
              if (row.age < 0) assert.equal(row.lit, 0);
            }
          }
          assert.equal(await page.locator(".battle-independent-light").count(), 0);
          results.push({ width, setting, cause, ...capture });
          console.log(`${width}px ${setting} ${cause}: independent light passed`);
        } finally {
          await page.close();
        }
      }
  const page = await browser.newPage({ viewport: { width: 320, height: 900 } });
  await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  const lifecycle = await page.evaluate(async () => {
    const React = (await import("/node_modules/.vite/deps/react.js")).default;
    const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
    const { SecurityClash } = await import("/src/game/SecurityClashView.tsx");
    const { buildSecurityDestructionScene } = await import("/src/game/securityClash.ts");
    const { waitForCardShatterClock } = await import("/src/game/cardShatterClock.ts");
    const { createAnimationQueue } = await import("/src/game/animationQueue.ts");
    const { ParticleLightScope } = await import("/src/game/ParticleLightScope.tsx");
    const source = await (await fetch("/src/game/SecurityClashView.tsx")).text();
    const { I18nProvider } = await import(source.match(/from "(\/src\/i18n\/index\.tsx[^" ]*)"/)[1]);
    function waitUntil(predicate) {
      const deadline = performance.now() + 6000;
      return new Promise((resolve, reject) => {
        function check() {
          if (performance.now() > deadline) return reject(new Error("Security light lifecycle deadline"));
          if (predicate()) resolve();
          else requestAnimationFrame(check);
        }
        check();
      });
    }
    const rows = [];
    for (const rate of [1, 2, 4])
      for (const action of ["complete", "cancel", "skip", "drain", "unmount", "scope", "overlap"]) {
        const host = document.createElement("div");
        document.querySelector(".game-board").append(host);
        const root = createRoot(host),
          queue = createAnimationQueue();
        queue.setRate(rate);
        let setScene, setScope, handoff;
        function Probe() {
          const [scene, set] = React.useState(null);
          const [showScope, updateScope] = React.useState(true);
          setScene = set;
          setScope = updateScope;
          React.useEffect(() => () => queue.clear(), []);
          return React.createElement(
            I18nProvider,
            null,
            showScope
              ? React.createElement(
                  ParticleLightScope,
                  null,
                  scene ? React.createElement(SecurityClash, { scene }) : null,
                )
              : null,
          );
        }
        root.render(React.createElement(Probe));
        await waitUntil(() => setScene);
        queue.enqueue({
          id: "probe-security",
          track: "probe-security",
          async run(context) {
            setScene({
              ...buildSecurityDestructionScene({ key: 991, cardId: "BT1-010", trashedSeat: 0, viewerSeat: 0 }),
              outcomeAtMs: 0,
              lightOwner: { context, enqueue: (step) => queue.enqueue(step) },
            });
            await context.wait(250);
            await waitForCardShatterClock(991, context);
            const light = document.querySelector('[data-light-id="security-light-991-revealed"]');
            const clock = light?.querySelector(".battle-burst__clock").getAnimations()[0];
            handoff = {
              age: clock ? Number(clock.currentTime) - Number(clock.effect.getTiming().delay) : null,
              blocks: queue.hasPendingStep(
                (step) =>
                  step.id.startsWith("security-light") && (step.blocksDecision !== false || step.holdsBoard !== false),
              ),
            };
            setScene(null);
          },
        });
        await waitUntil(() => handoff && !host.querySelector(".battle-clash"));
        const tailPresent = Boolean(document.querySelector('[data-light-id="security-light-991-revealed"]'));
        let overlapping = false;
        if (action === "overlap") {
          queue.enqueue({
            id: "probe-security-next",
            track: "probe-security-next",
            async run(context) {
              setScene({
                ...buildSecurityDestructionScene({ key: 992, cardId: "BT1-019", trashedSeat: 1, viewerSeat: 0 }),
                outcomeAtMs: 0,
                lightOwner: { context, enqueue: (step) => queue.enqueue(step) },
              });
              await context.wait(250);
              await waitForCardShatterClock(992, context);
              setScene(null);
            },
          });
          await waitUntil(() => document.querySelectorAll(".battle-independent-light").length === 2);
          overlapping = true;
        }
        if (action === "cancel") queue.clear();
        if (action === "skip") queue.skip();
        if (action === "drain") queue.setMode("drain");
        if (action === "unmount") root.unmount();
        if (action === "scope") setScope(false);
        await queue.idle();
        await new Promise(requestAnimationFrame);
        rows.push({
          rate,
          action,
          handoff,
          tailPresent,
          overlapping,
          cleaned: !document.querySelector(".battle-independent-light"),
        });
        if (action !== "unmount") root.unmount();
        host.remove();
      }
    return rows;
  });
  for (const row of lifecycle) {
    assert.ok(row.handoff.age >= 250 - 1e-9, JSON.stringify(row));
    assert.equal(row.handoff.blocks, false);
    assert.ok(row.tailPresent && row.cleaned, JSON.stringify(row));
    if (row.action === "overlap") assert.equal(row.overlapping, true);
  }
  await page.close();
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        scope:
          "Twelve natural Arena scenes plus twenty-one actual SecurityClash/queue lifecycle fixtures, natural clocks without seeking. Aegis geometry and palettes; no projected camera/material or full reference-video parity claim.",
        results,
        lifecycle,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("Security light probes passed; artifact:", new URL("capture.json", output).pathname);
} finally {
  await browser.close();
}
