#!/usr/bin/env node
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-field-light/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const width of [320, 768, 1024, 1440]) {
    for (const reduced of [false, true]) {
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
        if (reduced) {
          // The reduced queue omits decorative focus. Mount a retained production
          // EffectFocus to check its own media-query contract independently.
          await page.evaluate(async () => {
            const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
            const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
            const { EffectFocus } = await import("/src/game/EffectFocus.tsx");
            const field = document.querySelector(".game-board");
            const permanent = field.querySelector(".game-permanent");
            const host = document.createElement("div");
            field.append(host);
            window.aegisReducedLightRoot = createRoot(host);
            window.aegisReducedLightRoot.render(
              createElement(EffectFocus, {
                sources: [{ key: 900, seat: 0, cardId: "ST1-03", site: { zone: "field", permanentId: "retained" } }],
                board: { current: field },
                permanents: { current: { retained: permanent } },
                choosingTargets: false,
              }),
            );
          });
          await page.locator(".game-field-activation-light").waitFor({ state: "attached" });
          const result = await page.evaluate(() => {
            const light = document.querySelector(".game-field-activation-light");
            return {
              visible: getComputedStyle(light.closest(".game-effect-focus__pulse")).display !== "none",
              animations: light.getAnimations().length,
              overflow: document.documentElement.scrollWidth > innerWidth,
            };
          });
          if (errors.length || result.visible || result.animations || result.overflow)
            throw new Error("Retained reduced-motion focus kept its decorative light/clock");
          await page.evaluate(() => window.aegisReducedLightRoot.unmount());
          results.push({ width, reduced, productionComponent: true, result });
          console.log(`${width}px: retained production reduced-motion focus has no light/clock`);
          continue;
        }
        for (const timing of ["Start of Main Phase", "On Play"]) {
          let hover;
          await page.evaluate(() => {
            const capture = (window.aegisFieldLight = { rows: [], complete: false });
            let owner;
            function sample() {
              const focus = document.querySelector('[data-testid="effect-focus"]');
              owner ??= focus;
              if (owner && !owner.isConnected) {
                capture.complete = true;
                return;
              }
              const light = focus?.querySelector(".game-field-activation-light");
              if (light) {
                const bounds = focus.getBoundingClientRect();
                const board = focus.closest(".game-board").getBoundingClientRect();
                const covers = (selector) => {
                  return [...document.querySelectorAll(selector)].every((element) => {
                    const area = element.getBoundingClientRect();
                    return (
                      bounds.left <= Math.max(board.left, area.left) + 1 &&
                      bounds.top <= Math.max(board.top, area.top) + 1 &&
                      bounds.right >= Math.min(board.right, area.right) - 1 &&
                      bounds.bottom >= Math.min(board.bottom, area.bottom) - 1
                    );
                  });
                };
                const animation = light.getAnimations()[0];
                const source = focus.querySelector(".game-effect-focus__source");
                const pulse = focus.querySelector(".game-effect-focus__pulse");
                const mask = document.getElementById(pulse.getAttribute("mask").slice(5, -1));
                const aperture = mask?.querySelector('rect[fill="black"]');
                const viewportMatrix = light.parentElement.getScreenCTM();
                const viewportCenter = new DOMPoint(0, 0).matrixTransform(viewportMatrix);
                const lightCenter = new DOMPoint(0, 0).matrixTransform(light.getScreenCTM());
                capture.rows.push({
                  time: animation?.currentTime,
                  duration: animation?.effect.getTiming().duration,
                  opacity: Number(getComputedStyle(light).opacity),
                  visible: getComputedStyle(pulse).display !== "none",
                  coversBoard:
                    focus.parentElement.classList.contains("game-board") &&
                    ["left", "top", "width", "height"].every((key) => Math.abs(bounds[key] - board[key]) < 1),
                  coversHand: covers(".game-hand-dock"),
                  coversBreeding: covers(".game-breeding-dock"),
                  coversBottom: covers(".game-player-dock"),
                  coversMemory: covers(".game-memory-band"),
                  shade: getComputedStyle(focus.querySelector(".game-effect-focus__shade")).fillOpacity,
                  pointerEvents: getComputedStyle(focus).pointerEvents,
                  source: source.getBoundingClientRect().toJSON(),
                  viewport: {
                    x: viewportCenter.x - viewportMatrix.a * 110,
                    y: viewportCenter.y - viewportMatrix.d * 154,
                    width: viewportMatrix.a * 220,
                    height: viewportMatrix.d * 308,
                  },
                  lightCenter: { x: lightCenter.x, y: lightCenter.y },
                  apertureMatches:
                    !!aperture &&
                    ["x", "y", "width", "height"].every(
                      (key) => aperture.getAttribute(key) === source.getAttribute(key),
                    ),
                  oldParticles: document.querySelectorAll(".game-effect-source-particles, .game-effect-focus__ring")
                    .length,
                  overflow: document.documentElement.scrollWidth > innerWidth,
                });
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          });
          await page.getByRole("button", { name: "Demo tools", exact: true }).click();
          await page.getByRole("menuitem", { name: `Preview activation: ${timing}`, exact: true }).click();
          await page.locator('[data-testid="effect-focus"]').waitFor();
          if (timing === "On Play") {
            await page.evaluate(async () => {
              const focus = document.querySelector('[data-testid="effect-focus"]');
              await Promise.all(focus.getAnimations().map((animation) => animation.finished.catch(() => {})));
            });
            await page.screenshot({ path: new URL(`focus-${width}.png`, output).pathname });
            const hoverTargetBounds = await page.locator(".game-hand-card").last().boundingBox();
            await page.mouse.move(
              hoverTargetBounds.x + hoverTargetBounds.width / 2,
              Math.min(890, hoverTargetBounds.y + hoverTargetBounds.height * 0.6),
            );
            await page.locator(".game-hand-hover__face").waitFor();
            hover = await page.evaluate(() => {
              const focus = document.querySelector('[data-testid="effect-focus"]');
              const face = document.querySelector(".game-hand-hover__face");
              const shade = getComputedStyle(face, "::after");
              const hand = document.querySelector(
                `[data-hand-instance-id="${CSS.escape(face.dataset.handHoverInstanceId)}"]`,
              );
              const bounds = hand.getBoundingClientRect();
              const rootShade = focus.querySelector(".game-effect-focus__shade");
              // Temporarily make the noninteractive shade hittable to inspect the
              // painted order; restore it before any user input or screenshot.
              const previous = rootShade.style.pointerEvents;
              rootShade.style.pointerEvents = "auto";
              const hits = document.elementsFromPoint(bounds.x + bounds.width / 2, Math.min(890, bounds.y + 20));
              rootShade.style.pointerEvents = previous;
              const fanIndex = hits.findIndex((element) => element.closest(".game-hand-card"));
              const shadeIndex = hits.indexOf(rootShade);
              return {
                background: shade.backgroundColor,
                inset: shade.inset,
                pointerEvents: shade.pointerEvents,
                content: shade.content,
                portalShadeZ: Number(shade.zIndex),
                dockIsolation: getComputedStyle(hand.closest(".game-hand-dock")).isolation,
                fanUnderShade: shadeIndex >= 0 && (fanIndex < 0 || fanIndex > shadeIndex),
              };
            });
            if (
              hover.background !== "rgba(4, 9, 18, 0.62)" ||
              hover.inset !== "0px" ||
              hover.pointerEvents !== "none" ||
              hover.content !== '""' ||
              hover.portalShadeZ !== 3 ||
              hover.dockIsolation !== "isolate" ||
              !hover.fanUnderShade
            )
              throw new Error(`${width}px: hovered/selected fan or portal escaped the board shade`);
            await page.screenshot({ path: new URL(`focus-hover-${width}.png`, output).pathname });
          }
          await page.waitForFunction(() => window.aegisFieldLight.complete);
          if (hover) {
            const restored = await page.evaluate(() => {
              const face = document.querySelector(".game-hand-hover__face");
              return {
                isolation: getComputedStyle(document.querySelector(".game-hand-dock")).isolation,
                shade: face ? getComputedStyle(face, "::after").content : "none",
              };
            });
            if (restored.isolation !== "auto" || restored.shade !== "none")
              throw new Error(`${width}px: hover shade or fan isolation remained after focus`);
            hover.restored = restored;
            await page.mouse.move(0, 0);
          }
          const rows = await page.evaluate(() => window.aegisFieldLight.rows);
          await writeFile(new URL("last-case.json", output), JSON.stringify({ width, reduced, timing, rows }, null, 2));
          if (
            errors.length ||
            rows.length < 3 ||
            rows.some(
              (row) =>
                row.overflow ||
                row.oldParticles ||
                !row.apertureMatches ||
                !row.coversBoard ||
                !row.coversHand ||
                !row.coversBreeding ||
                !row.coversBottom ||
                !row.coversMemory ||
                Number(row.shade) !== 0.62 ||
                row.pointerEvents !== "none",
            )
          )
            throw new Error(`${width}px ${timing}: incomplete board dim, missing/unmasked light or overflow`);
          {
            const intermediate = rows.filter((row) => row.time > 0 && row.time < 360 && row.opacity > 0);
            const finished = rows.filter((row) => row.time >= 360);
            if (
              intermediate.length < 3 ||
              Math.max(...intermediate.map((row) => row.opacity)) < 0.8 ||
              !finished.length ||
              finished.some((row) => row.opacity > 0.001) ||
              rows.some((row) => row.duration !== 360)
            )
              throw new Error(`${width}px ${timing}: flare never peaked or remained visible after its 360ms clock`);
            for (const row of rows) {
              if (
                Math.abs(row.viewport.width / row.source.width - 2.2) > 0.002 ||
                Math.abs(row.viewport.height / row.source.height - 2.2) > 0.002 ||
                Math.abs(row.viewport.x + row.viewport.width / 2 - row.source.x - row.source.width / 2) > 0.1 ||
                Math.abs(row.viewport.y + row.viewport.height / 2 - row.source.y - row.source.height / 2) > 0.1 ||
                Math.abs(row.lightCenter.x - row.source.x - row.source.width / 2) > 0.1 ||
                Math.abs(row.lightCenter.y - row.source.y - row.source.height / 2) > 0.1
              )
                throw new Error("Flare lost the actual source face's centre or relative scale");
            }
          }
          results.push({ width, reduced, timing, rows, hover });
          console.log(`${width}px ${timing}${reduced ? " reduced" : ""}: source mask, light clock and cleanup passed`);
        }
      } finally {
        await page.close();
      }
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        results,
        note: "Eight natural Arena fixtures and four retained reduced-motion production-component probes; no animation clock sought. The renderer's silhouette is an adaptation, not reconstructed source particles/camera.",
      },
      null,
      2,
    ),
  );
  console.log(`${results.length} field activation cases passed (natural Arena + reduced production component)`);
} finally {
  await browser.close();
}
