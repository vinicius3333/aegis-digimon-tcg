#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { visualProbeOptions } from "./visual-probe-options.mjs";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const values = visualProbeOptions("mobile-toasts-board");
const { output } = values;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const layout of ["production", "dev-toolbar"]) {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 320, height: 740 },
      { width: 375, height: 812 },
      { width: 390, height: 844 },
      { width: 768, height: 1024 },
      { width: 844, height: 390 },
      { width: 1440, height: 900 },
    ]) {
      const page = await browser.newPage({ viewport });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.addInitScript((speed) => {
          localStorage.setItem("aegis:locale", "en");
          localStorage.setItem("aegis.effect-speed", speed);
        }, values.speed);
        await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
        await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
        if (layout === "production")
          await page.locator(".aegis-arena-demo-toolbar").evaluate((toolbar) => {
            toolbar.style.display = "none";
          });
        await page.waitForTimeout(800);
        const measureArt = () =>
          page.locator(".game-battle-row .game-card-enter > [data-state]").evaluateAll((cards) =>
            cards.map((card) => {
              const art = card.getBoundingClientRect().toJSON();
              const row = card.closest(".game-battle-row").getBoundingClientRect().toJSON();
              const clips = [card.closest(".game-battle-lane"), card.closest(".game-battle-zones")]
                .filter(
                  (node) =>
                    node && getComputedStyle(node).overflowY !== "visible" && node.getBoundingClientRect().height > 0,
                )
                .map((node) => node.getBoundingClientRect().toJSON());
              return {
                art,
                row,
                clips,
                cropped: [row, ...clips].some((clip) => art.top < clip.top - 1 || art.bottom > clip.bottom + 1),
              };
            }),
          );
        await page.locator(".game-field").evaluate((field) => {
          field.style.marginTop = "0px";
        });
        await page.waitForTimeout(100);
        const withoutGutter = await measureArt();
        await page.locator(".game-field").evaluate((field) => {
          field.style.marginTop = "";
        });
        await page.waitForTimeout(100);
        const withGutter = await measureArt();
        assert(withGutter.length > 0, "occupied field art was not measured");
        assert(
          withGutter.every(({ cropped }) => !cropped),
          "the gutter crops field card art vertically",
        );
        const fieldGeometry = await page.locator(".game-field").evaluate((field) => ({
          height: field.clientHeight,
          scrollHeight: field.scrollHeight,
          overflowY: getComputedStyle(field).overflowY,
        }));
        await page.evaluate(async () => {
          const React = (await import("/node_modules/.vite/deps/react.js")).default;
          const { createRoot } = (await import("/node_modules/.vite/deps/react-dom_client.js")).default;
          const transformed = await (await fetch("/src/game/NarrationStack.tsx")).text();
          const i18nUrl = transformed.match(/from "(\/src\/i18n\/index\.tsx[^" ]*)"/)[1];
          const { I18nProvider } = await import(i18nUrl);
          const { NarrationStack } = await import("/src/game/NarrationStack.tsx");
          const { Side } = await import("/src/game/side.ts");
          const { DecisionOverlay } = await import("/src/game/overlay/choice/DecisionOverlay.tsx");
          const host = document.createElement("div");
          host.dataset.noticeLaneProbe = "true";
          host.style.display = "contents";
          document.querySelector(".game-board").append(host);
          const root = createRoot(host),
            createdAt = Date.now();
          const narration = new Map();
          for (let index = 0; index < 4; index++) {
            const id = `lane-${index}`;
            narration.set(id, {
              id,
              side: Side.Viewer,
              createdAt,
              batchId: "lane-fixture",
              notice: {
                id,
                side: Side.Viewer,
                createdAt,
                fromSecurity: false,
                body: {
                  variant: "effect",
                  cardId: "BT1-010",
                  timing: "OnPlay",
                  description: "Draw 1 card. Gain 1 memory.",
                },
              },
              panel: {
                id,
                side: Side.Viewer,
                createdAt,
                titleKey: "panel.revealedCards",
                cards: [{ cardId: "BT1-010", badge: 1 }],
                ordered: false,
              },
            });
          }
          window.noticeLaneProbe = {
            expire() {
              narration.clear();
            },
            async render(kind, rejection = false) {
              root.render(
                React.createElement(
                  I18nProvider,
                  null,
                  React.createElement(NarrationStack, {
                    narration,
                    compact: innerWidth < 1024 || innerHeight < 520,
                    rejection: rejection
                      ? {
                          id: "refused",
                          side: Side.Viewer,
                          createdAt,
                          fromSecurity: false,
                          body: { variant: "rejection", reason: "Cannot play" },
                        }
                      : null,
                    nowMs: createdAt,
                    onAdvance: () => {},
                    onDismissRejection: () => {},
                  }),
                  kind
                    ? React.createElement(DecisionOverlay, {
                        request: {
                          decisionId: "lanes-decision",
                          seat: 0,
                          kind,
                          promptText: "Choose the next effect",
                          options:
                            kind === "orderTriggers"
                              ? {
                                  triggerKeys: ["one", "two"],
                                  triggerCardIds: ["BT1-010", "BT1-043"],
                                  triggerDescriptions: ["Draw 1 card.", "Gain 1 memory."],
                                  acceptsResolutionPlan: true,
                                }
                              : { min: 1, max: 1 },
                        },
                        candidates:
                          kind === "chooseTargets"
                            ? [{ instanceId: "target", cardId: "BT1-010", selectable: true }]
                            : [],
                        picks: [],
                        onTogglePick: () => {},
                        onRespond: () => {},
                      })
                    : null,
                ),
              );
              for (let frame = 0; frame < 3; frame++) await new Promise(requestAnimationFrame);
            },
            measure() {
              return [...host.querySelectorAll(".narration-slot")].map((slot) => ({
                slot: slot.dataset.slot,
                box: slot.getBoundingClientRect().toJSON(),
                toasts: slot.querySelectorAll(".match-notice, .side-panel, .compact-toast").length,
                ids: [...slot.querySelectorAll(".narration-item")].map((item) => item.dataset.narrationId),
                entries: [...slot.querySelectorAll('.match-notice[data-variant="effect"]')].flatMap((toast) =>
                  toast
                    .getAnimations()
                    .filter((animation) => animation.animationName === "effect-notice-in")
                    .map((animation) => ({
                      duration: animation.effect.getTiming().duration,
                      easing: animation.effect.getTiming().easing,
                    })),
                ),
              }));
            },
            dispose() {
              root.unmount();
              host.remove();
            },
          };
          await window.noticeLaneProbe.render(null);
        });
        const before = await page.evaluate(() => window.noticeLaneProbe.measure());
        assert.equal(before.length, 2);
        assert(before.every((lane) => lane.toasts === 2 && lane.ids.join(",") === "lane-2,lane-3"));
        const entries = before.flatMap((lane) => lane.entries);
        if (viewport.width >= 1024 && viewport.height >= 520)
          assert(entries.length > 0 && entries.every((entry) => entry.duration === 100));
        await page
          .locator("[data-notice-lane-probe] .compact-toast")
          .evaluateAll((toasts) =>
            Promise.all(toasts.flatMap((toast) => toast.getAnimations().map((animation) => animation.finished))),
          );
        const captureSize = `${layout}-${viewport.width}x${viewport.height}`;
        await page.screenshot({ path: new URL(`toasts-${captureSize}.png`, output).pathname });
        const interceptedBoardControls = await page.locator(".game-board").evaluate((board) =>
          [...board.querySelectorAll('button, [role="button"], a[href], summary')]
            .filter((control) => {
              if (control.closest("[data-notice-lane-probe]")) return false;
              const box = control.getBoundingClientRect();
              const x = box.x + box.width / 2,
                y = box.y + box.height / 2;
              return (
                box.width > 0 &&
                box.height > 0 &&
                x > 0 &&
                x < innerWidth &&
                y > 0 &&
                y < innerHeight &&
                document.elementFromPoint(x, y)?.closest(".compact-toast")
              );
            })
            .map((control) => control.getAttribute("aria-label") ?? control.textContent),
        );
        assert.deepEqual(interceptedBoardControls, [], "a toast intercepted board card/utility/memory controls");
        if (await page.locator("[data-notice-lane-probe] .compact-toast__open").count()) {
          assert(
            await page.locator("[data-notice-lane-probe] .compact-toast__open").evaluateAll((buttons) =>
              buttons.every((button) => {
                const box = button.getBoundingClientRect();
                return box.width >= 44 && box.height >= 44;
              }),
            ),
            "a mobile notice tap target is below 44px",
          );
          await page.locator("[data-notice-lane-probe] .compact-toast__open").first().click();
          const details = page.getByRole("dialog", { name: "Notice details" });
          await details.waitFor();
          assert(
            await details.evaluate((dialog) => {
              const box = dialog.getBoundingClientRect();
              return [...dialog.querySelectorAll(".match-notice, .side-panel__cards")].every((node) => {
                const content = node.getBoundingClientRect();
                return content.left >= box.left && content.right <= box.right;
              });
            }),
            "detail content is clipped horizontally",
          );
          await page.keyboard.press("Shift+Tab");
          assert(await details.evaluate((dialog) => dialog.contains(document.activeElement)), "focus escaped details");
          await page.screenshot({ path: new URL(`details-${captureSize}.png`, output).pathname });
          await page.keyboard.press("Escape");
        }
        for (const kind of ["chooseTargets", "orderTriggers"]) {
          await page.evaluate((decisionKind) => window.noticeLaneProbe.render(decisionKind), kind);
          await page.getByRole("dialog").waitFor();
          await page
            .getByRole("dialog")
            .evaluate(async (panel) => Promise.all(panel.getAnimations().map((animation) => animation.finished)));
          const blocked = await page.locator(".decision-overlay button").evaluateAll((buttons) =>
            buttons
              .filter((button) => {
                const box = button.getBoundingClientRect();
                const x = box.x + box.width / 2,
                  y = box.y + box.height / 2;
                return (
                  box.width > 0 &&
                  box.height > 0 &&
                  x > 0 &&
                  x < innerWidth &&
                  y > 0 &&
                  y < innerHeight &&
                  !document.elementFromPoint(x, y)?.closest(".decision-overlay")
                );
              })
              .map((button) => button.textContent),
          );
          assert.deepEqual(blocked, [], "a toast intercepted decision controls");
          const after = await page.evaluate(() => window.noticeLaneProbe.measure());
          assert.deepEqual(
            after.map(({ box, slot, toasts }) => ({ box, slot, toasts })),
            before.map(({ box, slot, toasts }) => ({ box, slot, toasts })),
            "decision moved/resized notice lanes",
          );
          if (kind === "orderTriggers")
            await page.screenshot({ path: new URL(`order-${captureSize}.png`, output).pathname });
          await page.evaluate(() => window.noticeLaneProbe.render(null));
        }
        await page.evaluate(() => window.noticeLaneProbe.render(null, true));
        const rejection = await page.evaluate(() => window.noticeLaneProbe.measure());
        assert(rejection.every((lane) => lane.toasts === 2));
        assert.deepEqual(
          rejection.map((lane) => lane.box),
          before.map((lane) => lane.box),
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        assert.equal(
          await page
            .locator("[data-notice-lane-probe] .compact-toast")
            .evaluateAll((toasts) =>
              toasts.some((toast) =>
                toast.getAnimations().some((animation) => animation.animationName === "compact-toast-in"),
              ),
            ),
          false,
          "compact notices still animate with reduced motion",
        );
        assert.equal(
          await page
            .locator('[data-notice-lane-probe] .match-notice[data-variant="effect"]')
            .evaluateAll((toasts) =>
              toasts.some((toast) =>
                toast.getAnimations().some((animation) => animation.animationName === "effect-notice-in"),
              ),
            ),
          false,
        );
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (await page.locator("[data-notice-lane-probe] .compact-toast__open").count()) {
          await page.locator("[data-notice-lane-probe] .compact-toast__open").first().click();
          const retainedContent = await page.getByRole("dialog", { name: "Notice details" }).innerText();
          await page.evaluate(async () => {
            window.noticeLaneProbe.expire();
            await window.noticeLaneProbe.render(null);
          });
          assert.equal(await page.locator("[data-notice-lane-probe] .compact-toast").count(), 0);
          assert.deepEqual(
            (await page.evaluate(() => window.noticeLaneProbe.measure())).map((lane) => lane.box),
            before.map((lane) => lane.box),
            "expiry shifted the empty lanes",
          );
          assert.equal(await page.getByRole("dialog", { name: "Notice details" }).innerText(), retainedContent);
          await page.getByRole("button", { name: "Close", exact: true }).click();
        }
        if (fieldGeometry.scrollHeight > fieldGeometry.height && fieldGeometry.overflowY === "auto") {
          await page.locator(".game-field").evaluate((field) => {
            field.scrollTop = field.scrollHeight;
          });
          const dockReachable = await page.locator(".game-utility-slot--you-raising").evaluate((slot) => {
            const box = slot.getBoundingClientRect();
            const field = slot.closest(".game-field").getBoundingClientRect();
            return box.top >= field.top && box.bottom <= field.bottom + 1;
          });
          assert(dockReachable, "short field scroll does not expose the raising dock");
          await page.screenshot({ path: new URL(`field-scrolled-${captureSize}.png`, output).pathname });
        }
        await page.evaluate(() => window.noticeLaneProbe.dispose());
        assert.deepEqual(errors, []);
        results.push({
          layout,
          viewport,
          withoutGutter,
          withGutter,
          field: fieldGeometry,
          before,
          rejection,
          decisions: ["chooseTargets", "orderTriggers"],
        });
        console.log(
          `${viewport.width}x${viewport.height}: two per side, stable decisions/rejection,compact details, stable decisions and reduced motion passed`,
        );
      } finally {
        await page.close();
      }
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        speed: values.speed,
        base: values.base,
        results,
        note: "Production narration and decision components on the Arena board with supplemental notification records; native taps, dialog focus, per-side counts, stable decision geometry and reduced motion. This probe does not provide engine-rule evidence.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
