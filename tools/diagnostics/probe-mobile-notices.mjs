#!/usr/bin/env node
/* The mobile notice row floats over the real Arena board without taking layout space.
   For each phone viewport this checks that empty, live, decision and refusal states leave
   every field, card, memory, hand and raising box exactly where it was; that the row spans
   the usable width on one line; that it never takes the centre of a gameplay control; and
   that the details sheet keeps its title on screen, traps focus, closes on Escape and keeps
   a moment readable after it expires. `--before` points at a server still running the
   reserved-gutter layout and records its card sizes for comparison. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { visualProbeOptions } from "./visual-probe-options.mjs";

const { chromium } = createRequire(new URL("../../apps/web/package.json", import.meta.url))("@playwright/test");
const { values: extra } = parseArgs({ options: { before: { type: "string" } }, strict: false });
const beforeFlag = process.argv.findIndex((arg) => arg === "--before" || arg.startsWith("--before="));
if (beforeFlag >= 0) process.argv.splice(beforeFlag, process.argv[beforeFlag].includes("=") ? 1 : 2);
const values = visualProbeOptions("mobile-notice-row");
const { output } = values;
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

async function openArena(page, base) {
  await page.addInitScript((speed) => {
    localStorage.setItem("aegis:locale", "en");
    localStorage.setItem("aegis.effect-speed", speed);
  }, values.speed);
  await page.goto(new URL("/dev/arena?mode=visual", base).href);
  await page.getByRole("button", { name: "Demo tools", exact: true }).waitFor();
  await page.locator(".aegis-arena-demo-toolbar").evaluate((toolbar) => {
    toolbar.style.display = "none";
  });
  await page.waitForTimeout(800);
  // Entrance animations still move cards for a moment after load; compare settled boxes only.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
}

/** Every box the notice row must never move, keyed so two states can be compared exactly. */
function boardGeometry(page) {
  return page.evaluate(() => {
    const box = (node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return [x, y, width, height].map((value) => Math.round(value * 10) / 10).join(",");
    };
    const pick = (selector) =>
      [...document.querySelectorAll(selector)].filter((node) => !node.closest("[data-notice-lane-probe]")).map(box);
    return {
      field: pick(".game-field"),
      rows: pick(".game-battle-row"),
      cards: pick(".game-battle-row .game-card-enter > [data-state]"),
      permanents: pick(".game-permanent"),
      memory: pick(".game-memory-gauge"),
      endPhase: pick(".game-end-turn-orb"),
      raising: pick(".game-breeding-slot__box"),
      utility: pick(".game-utility-slot, .game-security-shield"),
      hand: pick(".game-hand-card"),
      dock: pick(".game-player-dock"),
      opponentBar: pick(".game-opponent-bar"),
      fieldStyle: [...document.querySelectorAll(".game-field")].map((field) => ({
        marginTop: getComputedStyle(field).marginTop,
        clientHeight: field.clientHeight,
        scrollHeight: field.scrollHeight,
      })),
    };
  });
}

function cardSizes(geometry) {
  return [...new Set(geometry.cards.map((entry) => entry.split(",").slice(2).join("×")))];
}

/** Controls whose centre a notice element takes, which would make them untappable. */
function interceptedControls(page, noticeSelector) {
  return page.evaluate((selector) => {
    const controls = [...document.querySelectorAll('.game-board button, .game-board [role="button"]')].filter(
      (control) =>
        !control.closest("[data-notice-lane-probe], .narration-slot, .aegis-dialog-layer") &&
        control.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    );
    return controls
      .filter((control) => {
        const box = control.getBoundingClientRect();
        const x = box.x + box.width / 2,
          y = box.y + box.height / 2;
        if (box.width === 0 || box.height === 0 || x <= 0 || y <= 0 || x >= innerWidth || y >= innerHeight)
          return false;
        return Boolean(document.elementFromPoint(x, y)?.closest(selector));
      })
      .map((control) => {
        const box = control.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        const under = hit.getBoundingClientRect();
        return `${control.getAttribute("aria-label") ?? control.textContent.trim()} at ${Math.round(box.x + box.width / 2)},${Math.round(box.y + box.height / 2)} (under ${hit.className} ${Math.round(under.x)},${Math.round(under.y)} ${Math.round(under.width)}x${Math.round(under.height)})`;
      });
  }, noticeSelector);
}

/** Named gameplay controls a real tap at their centre must still reach. */
function keyControlHits(page) {
  return page.evaluate(() => {
    const groups = {
      endPhase: ".game-end-turn-orb",
      raising: ".game-breeding-slot__box",
      hand: ".game-hand-card",
      permanents: ".game-permanent",
      utility: ".game-utility-slot, .game-security-shield",
      counters: ".game-arena-counter",
      menu: ".game-mobile-menu > button, .game-mobile-log, .game-mobile-surrender",
    };
    return Object.fromEntries(
      Object.entries(groups).map(([name, selector]) => {
        const controls = [...document.querySelectorAll(selector)].filter((control) =>
          control.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        );
        const centreTarget = (control) => {
          const box = control.getBoundingClientRect();
          return document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        };
        const label = (control) => control.getAttribute("aria-label") ?? control.className;
        const blocked = controls.filter((control) => !control.contains(centreTarget(control)));
        // Only the notice row is under test; other board furniture (a lane's scroll arrow
        // over a clipped card) is recorded but belongs to the existing layout.
        return [
          name,
          {
            checked: controls.length,
            missed: blocked.filter((control) => centreTarget(control)?.closest(".narration-slot")).map(label),
            blockedByBoard: blocked
              .filter((control) => !centreTarget(control)?.closest(".narration-slot"))
              .map((control) => `${label(control)} (under ${centreTarget(control)?.className})`),
          },
        ];
      }),
    );
  });
}

async function mountProbe(page) {
  await page.evaluate(async () => {
    // Import the exact versioned dependency URLs the app uses, or React loads twice.
    const transformed = await (await fetch("/src/game/NarrationStack.tsx")).text();
    const entry = await (await fetch("/src/main.tsx")).text();
    const React = (await import(transformed.match(/from "(\/node_modules\/\.vite\/deps\/react\.js[^"]*)"/)[1])).default;
    const { createRoot } = (
      await import(entry.match(/from "(\/node_modules\/\.vite\/deps\/react-dom_client\.js[^"]*)"/)[1])
    ).default;
    const i18nUrl = transformed.match(/from "(\/src\/i18n\/index\.tsx[^" ]*)"/)[1];
    const { I18nProvider } = await import(i18nUrl);
    const { NarrationStack } = await import("/src/game/NarrationStack.tsx");
    const { Side } = await import("/src/game/side.ts");
    const { DecisionOverlay } = await import("/src/game/overlay/choice/DecisionOverlay.tsx");
    const host = document.createElement("div");
    host.dataset.noticeLaneProbe = "true";
    host.style.display = "contents";
    document.querySelector(".game-board").append(host);
    const root = createRoot(host);
    const createdAt = Date.now();
    const effect = (id, side, description) => ({
      id,
      side,
      createdAt,
      fromSecurity: false,
      body: { variant: "effect", cardId: "BT1-010", timing: "OnPlay", description },
    });
    const panel = (id, side, titleKey, count) => ({
      id,
      side,
      createdAt,
      titleKey,
      cards: Array.from({ length: count }, (_, index) => ({ cardId: "BT1-010", badge: index + 1 })),
      ordered: false,
    });
    // A paired opposing moment, a lone clause, a three-card list and a paired own moment:
    // the caps retain the last three, and the newest leads the row.
    const records = [
      {
        id: "lane-0",
        side: Side.Opponent,
        notice: effect("lane-0", Side.Opponent, "Draw 1 card."),
        panel: panel("lane-0", Side.Opponent, "panel.revealedCards", 1),
      },
      { id: "lane-1", side: Side.Viewer, notice: effect("lane-1", Side.Viewer, "Gain 1 memory.") },
      { id: "lane-2", side: Side.Opponent, panel: panel("lane-2", Side.Opponent, "panel.trashedCards", 3) },
      {
        id: "lane-3",
        side: Side.Viewer,
        notice: effect("lane-3", Side.Viewer, "Reveal 5 cards from the top of your deck."),
        panel: panel("lane-3", Side.Viewer, "panel.revealedCards", 1),
      },
    ];
    let narration = new Map();
    window.noticeLaneProbe = {
      fill() {
        narration = new Map(records.map((record) => [record.id, { ...record, batchId: "probe", createdAt }]));
      },
      expire() {
        narration = new Map();
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
      row() {
        const slot = host.querySelector('[data-slot="narration-row"]');
        const board = document.querySelector(".game-board").getBoundingClientRect();
        const open = slot.querySelector(".compact-row__open");
        const action = slot.querySelector(".compact-row__action");
        const round = (rect) => ({
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
        return {
          slot: round(slot.getBoundingClientRect()),
          slotPointerEvents: getComputedStyle(slot).pointerEvents,
          board: round(board),
          active: slot.querySelector(".compact-row")?.dataset.narrationId ?? null,
          tone: slot.querySelector(".compact-row")?.dataset.tone ?? null,
          more: slot.querySelector(".compact-row__more")?.textContent ?? null,
          open: open ? round(open.getBoundingClientRect()) : null,
          singleLine: open
            ? open.scrollHeight <= open.clientHeight + 1 && getComputedStyle(open).whiteSpace === "nowrap"
            : null,
          lineMetrics: open ? `${open.scrollHeight}/${open.clientHeight} ${getComputedStyle(open).whiteSpace}` : null,
          actionEllipsis: action ? getComputedStyle(action).textOverflow === "ellipsis" : null,
          actionTruncated: action ? action.scrollWidth > action.clientWidth : null,
          resultWidth: slot.querySelector(".compact-row__result-label")?.getBoundingClientRect().width ?? null,
          text: slot.textContent,
        };
      },
      dispose() {
        root.unmount();
        host.remove();
      },
    };
    await window.noticeLaneProbe.render(null);
  });
}

try {
  for (const viewport of VIEWPORTS) {
    const size = `${viewport.width}x${viewport.height}`;
    let before;
    if (extra.before) {
      const page = await browser.newPage({ viewport });
      await openArena(page, extra.before);
      before = await boardGeometry(page);
      await page.screenshot({ path: new URL(`before-gutter-${size}.png`, output).pathname });
      await page.close();
    }
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    try {
      await openArena(page, values.base);
      await mountProbe(page);
      const empty = await boardGeometry(page);
      assert(
        empty.fieldStyle.every((field) => field.marginTop === "0px"),
        "the field still reserves a top margin",
      );
      const emptyRow = await page.evaluate(() => window.noticeLaneProbe.row());
      assert.equal(emptyRow.active, null);
      assert.equal(emptyRow.slotPointerEvents, "none", "the floating host takes pointer events");
      await page.screenshot({ path: new URL(`empty-${size}.png`, output).pathname });

      await page.evaluate(async () => {
        window.noticeLaneProbe.fill();
        await window.noticeLaneProbe.render(null);
      });
      const live = await boardGeometry(page);
      assert.deepEqual(live, empty, "live notices moved or resized board geometry");
      const row = await page.evaluate(() => window.noticeLaneProbe.row());
      assert.equal(row.active, "lane-3");
      assert.equal(row.more, "+2", "the row must keep the two other retained moments behind its more control");
      assert(
        row.singleLine && row.actionEllipsis,
        `the row wraps or does not ellipsize: ${row.lineMetrics}, ellipsis ${row.actionEllipsis}`,
      );
      assert(!/\b1 cards\b/.test(row.text), "a single card is counted as plural");
      assert(row.resultWidth > 0, "the linked result has no visible label");
      assert(row.slot.height >= 24 && row.slot.height <= 44, `row height ${row.slot.height}px is outside 24-44px`);
      assert(row.open && row.open.height <= row.slot.height, "the row buttons overflow the row");
      assert(row.slot.width >= row.board.width - 16 - 1, "the row does not span the usable width");
      assert.deepEqual(
        await interceptedControls(page, "[data-notice-lane-probe] .narration-slot"),
        [],
        `the row ${JSON.stringify(row.slot)} takes the centre of a board control`,
      );
      const hits = await keyControlHits(page);
      for (const [name, { missed }] of Object.entries(hits))
        assert.deepEqual(missed, [], `${name} controls are not reachable at their centre`);
      const partlyCovered = await page.evaluate(() => {
        const line = document.querySelector("[data-notice-lane-probe] .compact-row").getBoundingClientRect();
        return [...document.querySelectorAll('.game-board button, .game-board [role="button"]')]
          .filter(
            (control) =>
              !control.closest("[data-notice-lane-probe]") &&
              control.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
          )
          .map((control) => ({ control, box: control.getBoundingClientRect() }))
          .filter(
            ({ box }) =>
              box.width > 0 &&
              box.bottom > line.top &&
              box.top < line.bottom &&
              box.right > line.left &&
              box.left < line.right,
          )
          .map(
            ({ control, box }) =>
              `${control.getAttribute("aria-label") ?? control.className}: ${Math.round(Math.min(box.bottom, line.bottom) - Math.max(box.top, line.top))}px`,
          );
      });
      await page
        .locator("[data-notice-lane-probe] .compact-row")
        .evaluate((line) => Promise.all(line.getAnimations().map((animation) => animation.finished)));
      await page.screenshot({ path: new URL(`live-${size}.png`, output).pathname });

      const open = page.locator("[data-notice-lane-probe] .compact-row__open");
      await open.focus();
      await page.keyboard.press("Enter");
      const details = page.getByRole("dialog", { name: "Notice details" });
      await details.waitFor();
      const sheet = await details.evaluate((dialog) => {
        const box = dialog.getBoundingClientRect();
        const title = dialog.querySelector("h2").getBoundingClientRect();
        return {
          titleVisible: title.top >= 0 && title.bottom <= innerHeight && title.top >= box.top,
          contentInside: [...dialog.querySelectorAll(".match-notice, .side-panel__cards")].every((node) => {
            const content = node.getBoundingClientRect();
            return content.left >= box.left && content.right <= box.right;
          }),
          entries: dialog.querySelectorAll(".notice-details__entry").length,
        };
      });
      assert(sheet.titleVisible, "the details title is clipped");
      assert(sheet.contentInside, "detail content is clipped horizontally");
      assert.equal(sheet.entries, 3, "details do not list every retained moment");
      await page.screenshot({ path: new URL(`details-${size}.png`, output).pathname });
      await page.keyboard.press("Shift+Tab");
      assert(await details.evaluate((dialog) => dialog.contains(document.activeElement)), "focus escaped details");
      await page.keyboard.press("Escape");
      await details.waitFor({ state: "detached" });
      assert(await open.evaluate((button) => document.activeElement === button), "focus did not return to the row");
      await page.locator("[data-notice-lane-probe] .compact-row__more").click();
      assert.equal(await details.locator('.notice-details__entry[aria-pressed="true"]').count(), 1);
      await page.keyboard.press("Escape");

      const decisions = {};
      for (const kind of ["chooseTargets", "orderTriggers"]) {
        await page.evaluate((decisionKind) => window.noticeLaneProbe.render(decisionKind), kind);
        await page.getByRole("dialog").waitFor();
        await page
          .getByRole("dialog")
          .evaluate((panel) => Promise.all(panel.getAnimations().map((animation) => animation.finished)));
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
        assert.deepEqual(blocked, [], "the row intercepted decision controls");
        assert.deepEqual(await boardGeometry(page), empty, `${kind} moved board geometry`);
        const decisionRow = await page.evaluate(() => window.noticeLaneProbe.row());
        assert.deepEqual(decisionRow.slot, row.slot, `${kind} moved the notice row`);
        decisions[kind] = { row: decisionRow.slot };
        await page.screenshot({ path: new URL(`decision-${kind}-${size}.png`, output).pathname });
        await page.evaluate(() => window.noticeLaneProbe.render(null));
      }

      await page.evaluate(() => window.noticeLaneProbe.render(null, true));
      const refusal = await page.evaluate(() => window.noticeLaneProbe.row());
      assert.equal(refusal.tone, "rejection");
      assert.deepEqual(refusal.slot, row.slot, "a refusal moved the notice row");
      assert.deepEqual(await boardGeometry(page), empty, "a refusal moved board geometry");

      await page.evaluate(() => window.noticeLaneProbe.render(null));
      await open.click();
      const retained = await details.innerText();
      await page.evaluate(async () => {
        window.noticeLaneProbe.expire();
        await window.noticeLaneProbe.render(null);
      });
      assert.equal(await page.locator("[data-notice-lane-probe] .compact-row").count(), 0);
      assert.equal(await details.innerText(), retained, "details changed after the moment expired");
      await page.getByRole("button", { name: "Close", exact: true }).click();
      assert(
        await page.evaluate(() =>
          document.activeElement?.matches('[data-notice-lane-probe] [data-slot="narration-row"]'),
        ),
        "focus did not fall back to the row host after expiry",
      );
      assert.deepEqual(await boardGeometry(page), empty, "expiry moved board geometry");

      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(async () => {
        window.noticeLaneProbe.fill();
        await window.noticeLaneProbe.render(null);
      });
      assert.equal(
        await page.locator("[data-notice-lane-probe] .compact-row").evaluate((line) => line.getAnimations().length),
        0,
        "the row still animates with reduced motion",
      );
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => window.noticeLaneProbe.dispose());
      assert.deepEqual(errors, []);
      results.push({
        viewport,
        cardSizes: { before: before ? cardSizes(before) : null, after: cardSizes(empty) },
        fieldBefore: before?.fieldStyle ?? null,
        fieldAfter: empty.fieldStyle,
        row,
        partlyCovered,
        hits,
        sheet,
        decisions,
      });
      console.log(
        `${size}: row ${row.slot.width}×${row.slot.height} at y${row.slot.y}, cards ${cardSizes(empty).join("/")}${before ? ` (gutter build ${cardSizes(before).join("/")})` : ""}, geometry stable across empty/live/decision/refusal/expiry`,
      );
    } catch (error) {
      if (errors.length) console.error(`${size} page errors:`, errors);
      throw error;
    } finally {
      await page.close();
    }
  }
  await writeFile(
    new URL("capture.json", output),
    JSON.stringify(
      {
        speed: values.speed,
        base: values.base,
        before: extra.before ?? null,
        results,
        note: "Production narration and decision components on the Arena board with supplemental notification records; real pointer hit tests, dialog focus, stable board geometry and reduced motion. Geometry only: this is neither engine-rule nor native performance evidence.",
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
