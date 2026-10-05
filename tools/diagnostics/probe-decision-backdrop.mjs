#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const output = new URL("../../.local/motion-reference/aegis-decision-backdrop/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const route of ["/dev/arena?mode=visual", "/dev/effects-lab"]) {
    for (const width of [320, 768, 1440]) {
      for (const kind of ["chooseTargets", "orderTriggers"]) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on("pageerror", (error) => {
          errors.push(error.message);
          console.error(error.message);
        });
        try {
          await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
          await page.goto(`http://localhost:5174${route}`);
          await page.locator(".game-hand-dock").waitFor();
          // Mount the production decision at the same portal destination as MatchOverlays.
          await page.evaluate(async (decisionKind) => {
            const { createElement } = (await import("/node_modules/.vite/deps/react.js")).default;
            const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
            // Use Vite's exact dependency URL to share the existing translation context after HMR.
            const source = await (await fetch("/src/game/overlay/choice/DecisionOverlay.tsx")).text();
            const i18nUrl = source.match(/from "(\/src\/i18n\/index\.tsx[^" ]*)"/)[1];
            const { I18nProvider } = await import(i18nUrl);
            const { DecisionOverlay } = await import("/src/game/overlay/choice/DecisionOverlay.tsx");
            const host = document.createElement("div");
            host.style.display = "contents";
            (document.getElementById("aegis-stage") ?? document.querySelector(".game-layout")).append(host);
            window.aegisDecisionProbeRoot = createRoot(host);
            window.aegisDecisionProbeRoot.render(
              createElement(
                I18nProvider,
                null,
                createElement(DecisionOverlay, {
                  request: {
                    decisionId: "coverage-probe",
                    seat: 0,
                    kind: decisionKind,
                    promptText: "Choose the next effect",
                    options:
                      decisionKind === "orderTriggers"
                        ? {
                            triggerKeys: ["first", "second"],
                            triggerCardIds: ["BT1-010", "BT1-043"],
                            triggerDescriptions: ["Draw 1 card.", "Gain 1 memory."],
                            acceptsResolutionPlan: true,
                          }
                        : { min: 1, max: 1 },
                  },
                  candidates:
                    decisionKind === "chooseTargets"
                      ? [{ instanceId: "target", cardId: "BT1-010", selectable: true }]
                      : [],
                  picks: [],
                  onTogglePick: () => {},
                  onRespond: () => {},
                }),
              ),
            );
          }, kind);
          const panel = page.getByRole("dialog");
          await panel.waitFor();
          await panel.evaluate(async (element) =>
            Promise.all(element.getAnimations().map((animation) => animation.finished)),
          );
          const geometry = await page.evaluate(() => {
            const backdrop = document.querySelector(".decision-overlay-backdrop");
            const shade = backdrop.getBoundingClientRect();
            const regions = [
              ...document.querySelectorAll(".game-hand-dock, .game-breeding-dock, .game-player-dock"),
            ].map((element) => {
              const bounds = element.getBoundingClientRect();
              const x = Math.max(1, Math.min(innerWidth - 1, bounds.x + bounds.width / 2));
              const y = Math.max(1, Math.min(innerHeight - 1, bounds.y + bounds.height / 2));
              return {
                className: element.className,
                bounds: bounds.toJSON(),
                coveredAtPoint: !!document
                  .elementFromPoint(x, y)
                  ?.closest(".decision-overlay-backdrop, .decision-overlay"),
              };
            });
            return {
              shade: shade.toJSON(),
              regions,
              width: innerWidth,
              height: innerHeight,
              background: getComputedStyle(backdrop).backgroundColor,
              oldPseudo: getComputedStyle(document.querySelector(".decision-overlay"), "::before").content,
            };
          });
          assert.equal(geometry.shade.x, 0);
          assert.equal(geometry.shade.y, 0);
          assert.equal(geometry.shade.width, geometry.width);
          assert.equal(geometry.shade.height, geometry.height);
          assert.notEqual(geometry.background, "rgba(0, 0, 0, 0)");
          assert.equal(geometry.oldPseudo, "none");
          for (const region of geometry.regions)
            assert.equal(region.coveredAtPoint, true, `${region.className} exposed`);
          if (route.includes("effects-lab") && kind === "orderTriggers" && width !== 768)
            await page.screenshot({ path: new URL(`lab-order-${width}.png`, output).pathname });
          await panel.getByRole("button", { name: "View board", exact: true }).click();
          assert.equal(await page.locator(".decision-overlay-backdrop").count(), 0);
          await page.getByRole("button", { name: "Return to decision", exact: true }).click();
          await panel.waitFor();
          assert.equal(await page.locator(".decision-overlay-backdrop").count(), 1);
          assert.deepEqual(errors, []);
          results.push({ route, width, kind, geometry });
          console.log(`${route} ${width}px ${kind}: hand/raising coverage, hit testing, view/return passed`);
        } finally {
          await page.close();
        }
      }
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        results,
        note: "Production decision components retained on Arena and live Effects Lab boards; verifies backdrop geometry/hit testing and view/return lifecycle, not event legality.",
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
