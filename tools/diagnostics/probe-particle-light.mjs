#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://localhost:5174" },
    smoke: { type: "boolean", default: false },
  },
});
const output = new URL("../../.local/motion-reference/aegis-particle-light/", import.meta.url);
await mkdir(output, { recursive: true });
const results = [],
  browser = await chromium.launch();
const scenes = [
  {
    name: "your-hatch",
    landing: true,
    hatch: 0,
    selector: '.game-breeding-slot[data-permanent-id="hatch-0"] .battle-burst--particles',
  },
  {
    name: "opponent-hatch",
    landing: true,
    hatch: 1,
    selector: '.game-breeding-slot[data-permanent-id="hatch-1"] .battle-burst--particles',
  },
  { name: "evolution", keyword: "Ascension", selector: ".game-permanent .battle-burst--evolve", landing: true },
  { name: "play", keyword: "Fortitude", selector: ".game-permanent .battle-burst--play", landing: true },
  { name: "deletion", keyword: "Retaliation", selector: ".game-delete-burst .battle-burst--particles" },
];
try {
  for (const width of values.smoke ? [320] : [320, 1440])
    for (const setting of values.smoke ? ["normal"] : ["normal", "fast", "reduced"])
      for (const scene of scenes) {
        const page = await browser.newPage({
          viewport: { width, height: 900 },
          reducedMotion: setting === "reduced" ? "reduce" : "no-preference",
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await page.addInitScript((speed) => {
            localStorage.setItem("aegis:locale", "en");
            localStorage.setItem("aegis.effect-speed", speed === "reduced" ? "normal" : speed);
          }, setting);
          await page.goto(
            new URL(`/dev/arena?mode=visual${scene.hatch !== undefined ? "&scenario=hatch" : ""}`, values.base).href,
          );
          await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
          if (scene.keyword) {
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page.getByRole("menuitem", { name: "Automatically preview keywords", exact: true }).click();
            await page.getByRole("button", { name: "Pause after this scene", exact: true }).click();
            await page.getByRole("button", { name: /1\/44 · Blocker/ }).click();
          }
          await page.evaluate(
            async ({ selector, reduced }) => {
              const { cardLandingPose } = await import("/src/game/cardLanding.ts");
              const capture = (window.aegisParticleLight = { rows: [], complete: false });
              const seen = new Set();
              let start;
              function sample(now) {
                const roots = [...document.querySelectorAll(selector)];
                for (const root of roots) {
                  seen.add(root);
                  start ??= now;
                  const canvas = root.querySelector("canvas"),
                    clock = root.querySelector(".battle-burst__clock");
                  const animation = clock?.getAnimations()[0];
                  const landingCard =
                    root.closest(".game-card-landing") ??
                    root.closest(".game-breeding-slot")?.querySelector(".game-card-enter");
                  const drop = landingCard
                    ?.getAnimations()
                    .find((entry) => entry.animationName === "battle-egg-landing");
                  const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
                  let projected;
                  if (drop) {
                    const parent = landingCard.offsetParent.getBoundingClientRect();
                    const board = landingCard.closest(".game-board").getBoundingClientRect();
                    const homeX = parent.left + landingCard.offsetLeft + landingCard.offsetWidth / 2;
                    const homeY = parent.top + landingCard.offsetTop + landingCard.offsetHeight / 2;
                    const actual = landingCard.getBoundingClientRect();
                    const expected = cardLandingPose(
                      Number(drop.currentTime),
                      landingCard.offsetWidth,
                      homeX - board.left - board.width / 2,
                      homeY - board.top - board.height / 2,
                    );
                    projected = {
                      age: Number(drop.currentTime),
                      scale: Number(getComputedStyle(landingCard).scale),
                      x: actual.left + actual.width / 2 - homeX,
                      y: actual.top + actual.height / 2 - homeY,
                      expected,
                    };
                  }
                  let lit = 0;
                  for (let i = 3; i < pixels.length; i += 64) if (pixels[i] > 4) lit++;
                  capture.rows.push({
                    age: Number(animation?.currentTime ?? 0) - Number(animation?.effect.getTiming().delay ?? 0),
                    duration: animation?.effect.getTiming().duration,
                    lit,
                    width: canvas.width,
                    height: canvas.height,
                    emitters: canvas.dataset.emitters,
                    capacity: canvas.dataset.capacity,
                    landing: canvas.dataset.landing === "true",
                    drop: drop
                      ? {
                          duration: drop.effect.getTiming().duration,
                          scale: getComputedStyle(landingCard).scale,
                          projected,
                        }
                      : null,
                    hidden: getComputedStyle(root).display === "none",
                    concurrent: roots.length,
                    overflow: document.documentElement.scrollWidth > innerWidth,
                  });
                }
                if (!reduced && seen.size && [...seen].every((root) => !root.isConnected)) {
                  capture.complete = true;
                  capture.elapsedMs = now - start;
                  return;
                }
                if (reduced && now > capture.startedAt + 10000) return;
                requestAnimationFrame(sample);
              }
              capture.startedAt = performance.now();
              requestAnimationFrame(sample);
            },
            { selector: scene.selector, reduced: setting === "reduced" },
          );
          if (scene.hatch !== undefined) {
            await page.getByRole("button", { name: "Demo tools", exact: true }).click();
            await page
              .getByRole("menuitem", {
                name: `Preview hatch: ${scene.hatch === 0 ? "your egg" : "opponent egg"}`,
                exact: true,
              })
              .click();
          } else {
            const select = page.getByRole("combobox", { name: "Choose a keyword" });
            await select.selectOption(
              await select.locator("option").filter({ hasText: scene.keyword }).getAttribute("value"),
            );
          }
          if (scene.landing && setting === "normal") {
            await page.waitForFunction(() => window.aegisParticleLight.rows.some((row) => row.age >= 60));
            await page.screenshot({ path: new URL(`${scene.name}-${width}-active.png`, output).pathname });
          }
          if (setting === "reduced") await page.waitForTimeout(2500);
          else await page.waitForFunction(() => window.aegisParticleLight.complete, undefined, { timeout: 20000 });
          const capture = await page.evaluate(() => window.aegisParticleLight);
          assert.deepEqual(errors, [], `${scene.name}: browser errors`);
          if (setting === "reduced") {
            assert(
              capture.rows.every((row) => row.hidden && row.lit === 0),
              "reduced particles must not paint",
            );
            if (scene.landing) {
              assert(
                capture.rows.every((row) => row.drop === null),
                "reduced landing must appear at rest",
              );
            }
          } else {
            if (scene.landing) {
              assert(
                capture.rows.some((row) => row.drop?.duration === 100),
                "missing100ms landing drop",
              );
              assert(
                capture.rows.filter((row) => row.age > 150).every((row) => row.drop?.scale === "1"),
                "landing did not settle",
              );
              for (const row of capture.rows) {
                const pose = row.drop?.projected;
                if (!pose) continue;
                assert(Math.abs(pose.scale - pose.expected.scale) < 0.00003, "incorrect reciprocal depth scale");
                assert(Math.abs(pose.x - pose.expected.x) < 0.15, "incorrect off-axis landing x");
                assert(Math.abs(pose.y - pose.expected.y) < 0.15, "incorrect off-axis landing y");
              }
            }
            assert(capture.rows.length > 20, "insufficient native-clock samples");
            assert(
              capture.rows.some((row) => row.lit > 0 && row.age > 900),
              "light was lost before the late tail",
            );
            assert(Math.max(...capture.rows.map((row) => row.age)) >= 1130, "particle owner cut its painted clock");
            assert(
              capture.rows.every(
                (row) =>
                  row.duration === 1150 &&
                  row.emitters === (scene.landing ? "10" : "6") &&
                  row.capacity === (scene.landing ? "495" : "305") &&
                  row.landing === !!scene.landing &&
                  !row.overflow,
              ),
            );
          }
          results.push({ width, setting, scene: scene.name, ...capture });
          console.log(`${width}px ${setting} ${scene.name}: passed`);
        } finally {
          await page.close();
        }
      }

  // The real component in an isolated eight-effect fixture: geometry/performance
  // here are supplemental, distinct from the natural Arena owner checks above.
  for (const width of values.smoke ? [320] : [320, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    try {
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
      const pending = page.evaluate(async () => {
        const React = (await import("/node_modules/.vite/deps/react.js")).default;
        const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
        const { CardBurst } = await import("/src/game/CardBurst.tsx");
        const { createLandingParticles } = await import("/src/game/particleLight.ts");
        const { paintParticleLight } = await import("/src/game/particleLightCanvas.ts");
        const landingParticles = createLandingParticles();
        const layerPixels = [];
        for (const role of new Set(landingParticles.map((particle) => particle.emitter.role))) {
          const canvas = document.createElement("canvas");
          canvas.width = 151;
          canvas.height = 212;
          const source = landingParticles.filter((particle) => particle.emitter.role === role);
          function lit(age) {
            paintParticleLight(canvas, age, { base: "#ffffff", edge: "#ff8080" }, source);
            const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
            return pixels.filter((value, index) => index % 4 === 3 && value > 0).length;
          }
          layerPixels.push({ role, peak: lit(100), late: lit(300), gone: lit(400) });
        }
        const panel = document.createElement("div");
        panel.dataset.particleStress = "true";
        panel.style.cssText =
          "position:fixed;inset:0;z-index:9999;background:#071321;display:grid;grid-template-columns:repeat(2,1fr);place-items:center";
        document.body.append(panel);
        const mount = createRoot(panel),
          frames = [],
          rows = [];
        const draw = CanvasRenderingContext2D.prototype.drawImage;
        let drawMs = 0,
          draws = 0;
        CanvasRenderingContext2D.prototype.drawImage = function (...args) {
          const before = performance.now();
          const result = draw.apply(this, args);
          drawMs += performance.now() - before;
          draws++;
          return result;
        };
        const colours = ["Red", "Blue", "Green", "Yellow", "Purple", "Black", "White", "Neutral"];
        mount.render(
          React.createElement(
            React.Fragment,
            null,
            ...colours.map((color) =>
              React.createElement(
                "div",
                { key: color, style: { position: "relative", width: 72, height: 101 } },
                React.createElement(CardBurst, { variant: "evolve", color, landing: true }),
              ),
            ),
          ),
        );
        let previous;
        await new Promise((resolve) => {
          const start = performance.now();
          function sample(now) {
            if (previous !== undefined) frames.push(now - previous);
            previous = now;
            const clocks = [...panel.querySelectorAll(".battle-burst__clock")].flatMap((clock) =>
              clock.getAnimations(),
            );
            rows.push({
              time: now - start,
              clocks: clocks.map((clock) => clock.currentTime),
              duration: clocks.map((clock) => clock.effect.getTiming().duration),
            });
            if (now - start < 1300) requestAnimationFrame(sample);
            else resolve();
          }
          requestAnimationFrame(sample);
        });
        const canvases = [...panel.querySelectorAll("canvas")];
        const cleared = canvases.every((canvas) =>
          canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height)
            .data.every((value) => value === 0),
        );
        const particles = canvases.map((canvas) => ({
          count: canvas.dataset.capacity,
          emitters: canvas.dataset.emitters,
        }));
        mount.unmount();
        panel.remove();
        CanvasRenderingContext2D.prototype.drawImage = draw;
        return { frames, rows, cleared, particles, drawMs, draws, layerPixels };
      });
      await page.waitForFunction(() =>
        [...document.querySelectorAll("[data-particle-stress] .battle-burst__clock")].some(
          (clock) => Number(clock.getAnimations()[0]?.currentTime) >= 180,
        ),
      );
      await page.screenshot({ path: new URL(`stress-${width}-active.png`, output).pathname });
      const capture = await pending;
      assert.equal(capture.particles.length, 8);
      assert(capture.particles.every((p) => p.count === "495" && p.emitters === "10"));
      assert(
        capture.layerPixels.every((layer) => layer.peak > 0 && layer.gone === 0),
        "landing layers missing or lingering",
      );
      assert(
        capture.layerPixels.every((layer) => (layer.role === "landing-beams" ? layer.late > 0 : layer.late === 0)),
        "landing lifetimes differ",
      );
      assert(capture.cleared, "eight simultaneous effects did not clear");
      assert(capture.draws > 10000, "stress fixture failed to paint the particles");
      assert(capture.rows.some((row) => row.clocks.length === 8 && row.clocks.every((age) => age > 1100)));
      results.push({ width, fixture: "eight-simultaneous", ...capture });
      console.log(
        `${width}px eight simultaneous: passed; ${capture.frames.length} frames; ${capture.drawMs.toFixed(1)}ms in drawImage`,
      );
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL(values.smoke ? "smoke.json" : "capture.json", output),
    JSON.stringify(
      {
        results,
        note: "Arena captures use live CSS clocks with development event fixtures. The eight-effect fixture is supplemental. Source paths/projection are not measured frame parity. drawImage time excludes simulation/style/layout.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
