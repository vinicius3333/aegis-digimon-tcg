#!/usr/bin/env node
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values } = parseArgs({ options: { base: { type: "string", default: "http://localhost:5174" } } });
const output = new URL("../../.local/motion-reference/aegis-notice-lanes/", import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const viewport of [
    { width: 768, height: 520 },
    { width: 1024, height: 760 },
    { width: 1440, height: 900 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await page.addInitScript(() => localStorage.setItem("aegis:locale", "en"));
      await page.goto(new URL("/dev/arena?mode=visual", values.base).href);
      await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
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
        document.getElementById("aegis-stage").append(host);
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
          async render(kind, rejection = false) {
            root.render(
              React.createElement(
                I18nProvider,
                null,
                React.createElement(NarrationStack, {
                  narration,
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
                        kind === "chooseTargets" ? [{ instanceId: "target", cardId: "BT1-010", selectable: true }] : [],
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
              toasts: slot.querySelectorAll(".match-notice, .side-panel").length,
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
      assert(entries.length > 0 && entries.every((entry) => entry.duration === 100));
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
          await page.screenshot({ path: new URL(`order-${viewport.width}.png`, output).pathname });
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
          .locator('[data-notice-lane-probe] .match-notice[data-variant="effect"]')
          .evaluateAll((toasts) =>
            toasts.some((toast) =>
              toast.getAnimations().some((animation) => animation.animationName === "effect-notice-in"),
            ),
          ),
        false,
      );
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => window.noticeLaneProbe.dispose());
      assert.deepEqual(errors, []);
      results.push({ viewport, before, rejection, decisions: ["chooseTargets", "orderTriggers"] });
      console.log(
        `${viewport.width}x${viewport.height}: two per side, stable decisions/rejection,100ms entry and reduced motion passed`,
      );
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        results,
        note: "Production narration/decision components on the real Arena board with supplemental records; geometry/count/entry checks, not engine-rule or complete reference parity.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
