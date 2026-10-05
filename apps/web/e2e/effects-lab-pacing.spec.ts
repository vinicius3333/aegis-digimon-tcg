import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { GamePage } from "./game-page";
import { SPOTLIGHT_PADDING_PX, SPOTLIGHT_RADIUS_PX } from "../src/game/spotlight";
import { DEFAULT_PACING } from "../src/game/pacing";
import {
  KEYWORD_PACING_SCENARIOS,
  KEYWORD_TURN_PACING_SCENARIOS,
  KEYWORD_PROTECTION_PACING_SCENARIOS,
  type KeywordPacingScenario,
} from "@aegis/shared";
import { startPacingCapture, finishPacingCapture } from "./pacing-capture";

/* A paced chain must keep moving in a real browser. The jsdom pacing harness replays the
   same scenarios on a fake clock, but a wait cycle between presentation steps only closes
   under the browser's own timing, so this drives the effects lab and watches the queue's
   trace. A queue that still owes steps and has not queued, started or
   finished one for STALL_MS is wedged; server batches alone do not count as progress. */

const STALL_MS = 10_000;
const LAB_KEY = "__aegisEffectsLab";

interface LabState {
  pendingSteps: number;
  queueIdle: boolean;
  steps: {
    key: string;
    stepId: string;
    track: string;
    phase: string;
    at: number;
    failed: boolean;
    cancelled: boolean;
    timing?: string;
    sourceCardId?: string;
    batchId?: string;
  }[];
  events: {
    kind: string;
    phase?: string;
    turnSeat?: number;
    seat?: number;
    sourceCardId?: string;
    timing?: string;
    printedTiming?: string;
    effectKey?: string;
    batch?: string;
  }[];
  decision?: { kind: string; sourceCardId?: string; sourcePermanentId?: string; options?: { min?: number } };
  board?: {
    live: {
      stateVersion: number;
      pendingDecision?: unknown;
      players: {
        battleArea: { permanentId: string; topCard: { cardId: string }; isSuspended: boolean; keywords?: string[] }[];
      }[];
    };
    displayed: { stateVersion: number };
    visible: {
      turn?: { seat: number; count: number };
      players: {
        securityCount: number;
        battleArea: { permanentId: string; topCard: { cardId: string }; isSuspended: boolean; currentDP: number }[];
      }[];
    };
  };
  gateExpiries: string[];
  batches: { id: string; receivedAt: number; stateVersion: number; events: { kind: string }[] }[];
  truncated: boolean;
  counters: { boardBudgetHits: number; decisionBudgetHits: number; decisionStallHits: number };
}
type LabReader = (() => LabState) & { reset(): void };
interface ArrivalPaint {
  cardId: string;
  permanentId: string;
  revealAt?: number;
  revealExitAt?: number;
  landingAt?: number;
  landedAt?: { x: number; y: number };
}

/** A fresh live DP change supersedes the decoration on that same card. */
function expectOnlyCompletedDpReplacements(steps: LabState["steps"]) {
  for (const cancelled of steps.filter((step) => step.cancelled)) {
    expect(cancelled.track).toMatch(/^dpPulse-/);
    const replacement = steps.find(
      (step) =>
        step.key !== cancelled.key &&
        step.track === cancelled.track &&
        step.phase === "started" &&
        Math.abs(step.at - cancelled.at) < 1,
    );
    expect(replacement, `replacement for ${cancelled.key}`).toBeDefined();
    expect(
      steps.some(
        (step) => step.key === replacement!.key && step.phase === "finished" && !step.cancelled && !step.failed,
      ),
    ).toBe(true);
  }
}

/** Native clicks may answer a mounted prompt before its first sampled paint. */
async function waitForDecisionPaint(page: Page, label: string) {
  await expect
    .poll(() =>
      page.evaluate((name) => {
        const capture = (
          window as unknown as { __keywordPacingCapture: { decisions: { label: string | null; closedAt?: number }[] } }
        )["__keywordPacingCapture"];
        return capture.decisions.some((decision) => decision.label === name && decision.closedAt === undefined);
      }, label),
    )
    .toBe(true);
}

class EffectsLabPage {
  constructor(readonly page: Page) {}
  button(name: RegExp) {
    return this.page.getByRole("button", { name }).filter({ visible: true });
  }
  async start(scenario = "effects-lab-opponent-chain", endTurn = true, speed = "normal") {
    await this.page.addInitScript((initialSpeed) => {
      localStorage.setItem("aegis:locale", "en");
      // Obsolete tuning must not shorten effects or switch the lab out of stacked.
      localStorage.setItem(
        "aegis.dev.effects-lab.pacing",
        JSON.stringify({ sourceHoldMs: 120, shortSourceHoldMs: 80, clauseStackMs: 0 }),
      );
      localStorage.setItem("aegis.effect-speed", initialSpeed);
    }, speed);
    await this.page.goto(`/dev/effects-lab?scenario=${scenario}`);
    await expect(this.button(/END BREEDING/i)).toBeEnabled({ timeout: 45_000 });
    await expect(this.page.getByRole("combobox", { name: /^pacing$/i })).toHaveCount(0);
    await expect(this.page.getByRole("button", { name: "Sequential", exact: true })).toHaveCount(0);
    await this.button(/^Collapse/i).click();
    await this.button(/END BREEDING/i).click();
    await expect(this.button(/END PHASE/i)).toBeEnabled({ timeout: 20_000 });
    await this.page.evaluate((key) => {
      const globals = window as unknown as Record<string, unknown>;
      (globals[key] as LabReader).reset();
      globals.__labPaintedNotices = new Set<string>();
      globals.__labNoticeAt = new Map<string, number>();
      globals.__labFocusedSources = new Set<string>();
      globals.__labFocusAt = new Map<string, number>();
      globals["__labFocusDurations"] = [] as { cardId: string; ms: number }[];
      globals.__labArrivals = new Map<string, ArrivalPaint>();
      let focused: { key: string; cardId: string; at: number } | undefined;
      const record = () => {
        for (const element of document.querySelectorAll<HTMLElement>("[data-narration-id]")) {
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          if (bounds.width > 0 && bounds.height > 0 && style.visibility !== "hidden" && Number(style.opacity) > 0) {
            (globals.__labPaintedNotices as Set<string>).add(element.dataset.narrationId!);
            const noticeAt = globals.__labNoticeAt as Map<string, number>;
            if (!noticeAt.has(element.dataset.narrationId!))
              noticeAt.set(element.dataset.narrationId!, performance.now());
          }
        }
        for (const element of document.querySelectorAll<SVGElement>('[data-testid="effect-focus"]'))
          if (element.getBoundingClientRect().width > 0 && Number(getComputedStyle(element).opacity) > 0) {
            (globals.__labFocusedSources as Set<string>).add(element.dataset.sourceCardId!);
            const focusAt = globals.__labFocusAt as Map<string, number>;
            if (!focusAt.has(element.dataset.sourceCardId!))
              focusAt.set(element.dataset.sourceCardId!, performance.now());
          }
        const source = document.querySelector<SVGElement>('[data-testid="effect-focus"]');
        const focusKey = source?.dataset.sourcePermanentId;
        if (focused && focused.key !== focusKey) {
          (globals["__labFocusDurations"] as { cardId: string; ms: number }[]).push({
            cardId: focused.cardId,
            ms: performance.now() - focused.at,
          });
          focused = undefined;
        }
        if (source && focusKey && !focused)
          focused = { key: focusKey, cardId: source.dataset.sourceCardId!, at: performance.now() };
        const reveals = (globals.__labRevealTimes ??= new Map<string, { at: number; exitAt?: number }>()) as Map<
          string,
          { at: number; exitAt?: number }
        >;
        const showcase = document.querySelector<HTMLElement>('[data-testid="zone-showcase"]');
        for (const [cardId, reveal] of reveals)
          if (cardId !== showcase?.dataset.cardId) reveal.exitAt ??= performance.now();
        if (showcase?.dataset.cardId && !reveals.has(showcase.dataset.cardId))
          reveals.set(showcase.dataset.cardId, { at: performance.now() });
        for (const element of document.querySelectorAll<HTMLElement>('[data-testid="confirmed-play-landing"]')) {
          if (element.getBoundingClientRect().width <= 0) continue;
          const { cardId, permanentId } = element.dataset;
          if (!cardId || !permanentId) continue;
          const arrivals = globals.__labArrivals as Map<string, ArrivalPaint>;
          const reveal = reveals.get(cardId);
          const entry = arrivals.get(permanentId) ?? { cardId, permanentId };
          entry.revealAt = reveal?.at;
          entry.revealExitAt = reveal?.exitAt;
          entry.landingAt ??= performance.now();
          const art = (element.querySelector("img") ?? element).getBoundingClientRect();
          entry.landedAt = { x: art.left + art.width / 2, y: art.top + art.height / 2 };
          arrivals.set(permanentId, entry);
        }
        globals.__labPaintFrame = requestAnimationFrame(record);
      };
      record();
    }, LAB_KEY);
    if (endTurn) await this.button(/END PHASE/i).click();
  }
  read() {
    return this.page.evaluate((key) => (window as unknown as Record<string, LabReader>)[key]!(), LAB_KEY);
  }
  async readEarlierNotices() {
    const column = this.page.locator('[data-slot="narration-text"]');
    const above = column.getByRole("button", { name: "Show more notices above" });
    const below = column.getByRole("button", { name: "Show more notices below" });
    await expect(above).toBeVisible({ timeout: 40_000 });
    const position = () => column.evaluate((element) => element.scrollTop);
    const before = await position();
    await above.click();
    await expect.poll(position).toBeLessThan(before - 24);
    await expect(below).toBeVisible();
    const newest = () => column.locator(".narration-item").last().getAttribute("data-narration-id");
    const reading = await newest();
    const upper = await position();
    await expect.poll(newest).not.toBe(reading);
    await expect.poll(position).toBeLessThanOrEqual(upper + 24);
    await expect(below).toBeVisible();
    const beforeDown = await position();
    await below.click();
    await expect.poll(position).toBeGreaterThan(beforeDown + 24);
  }
  async captureArrival(cardId: string, info: TestInfo) {
    await expect(this.page.locator(`[data-testid="zone-showcase"][data-card-id="${cardId}"]`)).toBeVisible();
    await this.page.screenshot({ path: info.outputPath("card-reveal.png") });
    await expect(this.page.locator(`[data-testid="confirmed-play-landing"][data-card-id="${cardId}"]`)).toBeVisible();
    await this.page.screenshot({ path: info.outputPath("confirmed-play-landing.png") });
  }
  async captureFocus(cardId: string, permanentId: string, info: TestInfo) {
    // The inspector is opened before accepting so its existing playback control can
    // freeze this source beat without adding a test-only command to the observation bridge.
    const focus = this.page.locator(
      `[data-testid="effect-focus"][data-source-card-id="${cardId}"][data-source-permanent-id="${permanentId}"]`,
    );
    await expect(focus).toBeVisible();
    const ready = () =>
      expect
        .poll(
          async () =>
            focus.evaluate(
              (element, config) => {
                const overlay = element.getBoundingClientRect();
                const field = element.parentElement!.getBoundingClientRect();
                const dim = element.querySelector(".game-effect-focus__shade");
                const maskHole = element.querySelector('mask rect[fill="black"]');
                const ring = element.querySelector<SVGRectElement>(".game-effect-focus__source");
                const permanent = [
                  ...document.querySelectorAll<HTMLElement>('[data-drop="perm-you"], [data-drop="perm-opp"]'),
                ].find((candidate) => candidate.dataset.id === element.dataset.sourcePermanentId);
                const art = (
                  permanent?.querySelector(".game-card-enter > [data-state]") ?? permanent
                )?.getBoundingClientRect();
                const hole = ring?.getBoundingClientRect();
                const viewBox = (element as SVGSVGElement).viewBox.baseVal;
                return {
                  opaque: Number(getComputedStyle(element).opacity) >= 0.9,
                  fillsField:
                    Math.abs(overlay.width - field.width) < 1 &&
                    Math.abs(overlay.height - field.height) < 1 &&
                    overlay.width > 0 &&
                    overlay.height > 0,
                  coversDock: [".game-hand-dock", ".game-breeding-dock"].every((selector) => {
                    const dock = element.closest(".game-board")?.querySelector(selector)?.getBoundingClientRect();
                    return (
                      !dock ||
                      (overlay.left <= Math.max(field.left, dock.left) + 1 &&
                        overlay.top <= Math.max(field.top, dock.top) + 1 &&
                        overlay.right >= Math.min(field.right, dock.right) - 1 &&
                        overlay.bottom >= Math.min(field.bottom, dock.bottom) - 1)
                    );
                  }),
                  currentViewBox:
                    Math.abs(viewBox.width - field.width) < 1 && Math.abs(viewBox.height - field.height) < 1,
                  dimmed: Boolean(dim && Number(getComputedStyle(dim).fillOpacity) > 0),
                  holeAligned: Boolean(
                    art &&
                    hole &&
                    Math.abs(hole.x - (art.x - config.padding)) < 1 &&
                    Math.abs(hole.y - (art.y - config.padding)) < 1 &&
                    Math.abs(hole.width - (art.width + 2 * config.padding)) < 1 &&
                    Math.abs(hole.height - (art.height + 2 * config.padding)) < 1,
                  ),
                  matchingMask: Boolean(
                    maskHole &&
                    ring &&
                    ["x", "y", "width", "height", "rx"].every(
                      (attribute) => maskHole.getAttribute(attribute) === ring.getAttribute(attribute),
                    ),
                  ),
                  rounded: Number(ring?.getAttribute("rx")) === config.radius,
                  measured: {
                    field: { width: field.width, height: field.height },
                    viewBox: { width: viewBox.width, height: viewBox.height },
                    art: art?.toJSON(),
                    hole: hole?.toJSON(),
                  },
                };
              },
              { padding: SPOTLIGHT_PADDING_PX, radius: SPOTLIGHT_RADIUS_PX },
            ),
          { timeout: 5000, intervals: [16, 32, 50] },
        )
        .toMatchObject({
          opaque: true,
          fillsField: true,
          coversDock: true,
          currentViewBox: true,
          dimmed: true,
          holeAligned: true,
          matchingMask: true,
          rounded: true,
        });
    // Pause also freezes CSS keyframes. Let the source's entrance paint fully first.
    await ready();
    await this.page.getByRole("button", { name: "Pause", exact: true }).click();
    await this.button(/^Collapse/i).click();
    await this.page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
    );
    await ready();
    await this.page.screenshot({ path: info.outputPath("accepted-field-source-focus.png") });
    await this.page.getByRole("button", { name: "‹", exact: true }).click();
    await this.page.getByRole("button", { name: "Resume", exact: true }).click();
    await this.button(/^Collapse/i).click();
  }
  async finish(reduced: boolean) {
    let progressAt = Date.now();
    let progress = "";
    let last: LabState | undefined;
    await expect
      .poll(
        async () => {
          last = await this.read();
          expect(last.truncated, "the dev observation ring lost evidence").toBe(false);
          const next = `${last.steps.length}:${last.steps.at(-1)?.key}:${last.steps.at(-1)?.phase}`;
          if (progress !== next) {
            progress = next;
            progressAt = Date.now();
          }
          if (last.pendingSteps > 0)
            expect(
              Date.now() - progressAt,
              `queue stalled with ${last.pendingSteps} steps: ${JSON.stringify(last.steps.slice(-8))}`,
            ).toBeLessThan(STALL_MS);
          expect(
            last.steps.filter((step) => step.failed),
            "a cue threw while the queue continued",
          ).toEqual([]);
          expect(last.gateExpiries, "a presentation gate was rescued by timeout").toEqual([]);
          // After its start-of-main chain the bot can check the fixture's Asuna in security.
          // Decline that separate optional cost so the real room, rather than only the queue,
          // reaches a terminal state for the observation.
          if (
            last.decision?.kind === "selectCards" &&
            last.decision.sourceCardId === "BT24-088" &&
            last.decision.options?.min === 0
          ) {
            const decline = this.page.getByRole("button", { name: "No Selection", exact: true });
            if (await decline.isVisible()) await decline.click();
          }
          const resolved = last.events.filter((event) => event.kind === "effectResolved" && event.seat === 1);
          return (
            resolved.length >= 5 &&
            last.queueIdle &&
            last.pendingSteps === 0 &&
            last.board?.live.pendingDecision === undefined &&
            last.board?.live.stateVersion === last.board?.displayed.stateVersion
          );
        },
        { timeout: 75_000, intervals: [50, 100, 200] },
      )
      .toBe(true);
    const observation = last!;
    expect(observation.board?.live.stateVersion).toBeGreaterThan(0);
    expect(observation.events.filter((event) => event.kind === "effectTriggered" && event.seat === 1)).toHaveLength(5);
    expect(observation.steps.filter((step) => step.phase === "dropped" || step.cancelled)).toEqual([]);
    expect(observation.counters).toMatchObject({ boardBudgetHits: 0, decisionBudgetHits: 0, decisionStallHits: 0 });
    const paint = await this.page.evaluate(() => {
      const globals = window as unknown as Record<string, unknown>;
      cancelAnimationFrame(globals.__labPaintFrame as number);
      return {
        notices: [...(globals.__labPaintedNotices as Set<string>)],
        sources: [...(globals.__labFocusedSources as Set<string>)],
        focusDurations: globals["__labFocusDurations"] as { cardId: string; ms: number }[],
      };
    });
    if (!reduced) {
      const triggers = observation.events.filter(
        (event) =>
          event.kind === "effectTriggered" &&
          event.seat === 1 &&
          (event.printedTiming ?? event.timing) === "StartOfYourMainPhase",
      );
      expect(triggers.map((event) => event.effectKey)).toEqual([
        "LM-002/ir-1-0",
        "EX8-011/ir-1-0",
        "P-200/ir-1-0",
        "P-199/ir-1-0",
        "BT26-104/ir-1-0",
      ]);
      const clauses = triggers.flatMap((trigger) => {
        const matching = observation.steps.filter(
          (step) =>
            step.phase === "started" &&
            step.stepId.startsWith("narration-step-") &&
            step.batchId === trigger.batch &&
            step.sourceCardId === trigger.sourceCardId &&
            step.timing === (trigger.printedTiming ?? trigger.timing),
        );
        expect(matching, `the exact ${trigger.effectKey} batch never started its clause`).toHaveLength(1);
        return matching;
      });
      expect(clauses).toHaveLength(5);
      for (const clause of clauses) expect(paint.notices).toContain(clause.stepId.slice("narration-step-".length));
      expect(paint.sources.length).toBeGreaterThan(0);
      const fieldSources = paint.focusDurations.filter(({ cardId }) =>
        ["LM-002", "EX8-011", "P-200", "P-199"].includes(cardId),
      );
      expect(fieldSources).toHaveLength(4);
      for (const source of fieldSources)
        expect(source.ms, `${source.cardId} source focus was cut short`).toBeGreaterThanOrEqual(
          DEFAULT_PACING.sourceHoldMs - 100,
        );
    }
  }
}

test.describe("effects lab pacing in the browser", () => {
  // The lab plays a real bot room, so it runs against the API's own entry point.
  let api: ChildProcess;
  let startupOutput = "";
  test.beforeAll(async () => {
    const listening = () =>
      new Promise<boolean>((resolve) => {
        const socket = connect(2569, "127.0.0.1", () => {
          socket.destroy();
          resolve(true);
        });
        socket.once("error", () => resolve(false));
      });
    expect(await listening(), "test API port 2569 is already occupied").toBe(false);
    api = spawn(process.execPath, ["dist/index.js"], {
      cwd: fileURLToPath(new URL("../../api/", import.meta.url)),
      env: { ...process.env, PORT: "2569" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    api.stdout?.on("data", (chunk) => {
      startupOutput += String(chunk);
    });
    api.stderr?.on("data", (chunk) => {
      startupOutput += String(chunk);
    });
    await expect
      .poll(
        async () => {
          expect(api.exitCode, startupOutput).toBeNull();
          return listening();
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  });
  test.afterAll(async () => {
    if (api?.exitCode === null) {
      const stopped = new Promise<void>((resolve) => api.once("exit", () => resolve()));
      api.kill();
      await stopped;
    }
  });
  test.afterEach(async ({ page }, info) => {
    if (info.status === info.expectedStatus || page.isClosed()) return;
    const active = await page.evaluate(() =>
      Boolean((window as unknown as Record<string, unknown>)["__keywordPacingCapture"]),
    );
    if (!active) return;
    const capture = await finishPacingCapture(page);
    const state = await new EffectsLabPage(page).read();
    const layout = await page.locator('[data-drop="battle-you"], [data-field-key]').evaluateAll((elements) =>
      elements.map((element) => ({
        className: element.className,
        dataset: { ...(element as HTMLElement).dataset },
        rect: element.getBoundingClientRect().toJSON(),
      })),
    );
    await info.attach("pacing-failure-diagnostic.json", {
      body: Buffer.from(JSON.stringify({ capture, state, layout }, null, 2)),
      contentType: "application/json",
    });
  });

  for (const scenario of KEYWORD_PACING_SCENARIOS as readonly KeywordPacingScenario[]) {
    const formats = [
      { name: "desktop", width: 1440, height: 1000, speed: "normal", reduced: false },
      { name: "desktop", width: 1440, height: 1000, speed: "fast", reduced: false },
      ...(scenario.decision
        ? [
            { name: "phone", width: 320, height: 844, speed: "normal", reduced: false },
            { name: "reduced motion", width: 1440, height: 1000, speed: "normal", reduced: true },
          ]
        : []),
    ];
    for (const format of formats) {
      const { speed } = format;
      test(`real keyword pacing: ${scenario.id} (${format.name}, ${speed})`, async ({ page }, info) => {
        await page.setViewportSize({ width: format.width, height: format.height });
        await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const lab = new EffectsLabPage(page);
        await lab.start(scenario.id, false, speed);
        const before = await lab.read();
        await startPacingCapture(page);
        const target =
          scenario.target === "player"
            ? page.locator('[data-drop="opp-security"]')
            : page.locator('[data-drop="perm-opp"][data-id="dev-perm-1-keyword-defender"]');
        await new GamePage(page).attack("dev-perm-0-keyword-attacker", target);
        if (scenario.decision?.kind === "Alliance") {
          const prompt = page.getByRole("region", { name: "Alliance window", exact: true });
          await expect(prompt).toBeVisible();
          await waitForDecisionPaint(page, "Alliance window");
          if (scenario.decision.accept) {
            await page.locator('[data-drop="perm-you"][data-id="dev-perm-0-keyword-ally-0"]').click();
            await page.getByRole("button", { name: "Use Alliance", exact: true }).click();
          } else await prompt.getByRole("button", { name: "Pass", exact: true }).click();
        }
        if (scenario.decision?.kind === "Barrier") {
          const prompt = page.getByRole("region", { name: "＜Barrier＞", exact: true });
          await expect(prompt).toBeVisible();
          await waitForDecisionPaint(page, "＜Barrier＞");
          await prompt
            .getByRole("button", {
              name: scenario.decision.accept ? "Yes, trash security" : "No, let it be deleted",
              exact: true,
            })
            .click();
        }
        await expect
          .poll(
            async () => {
              const state = await lab.read();
              expect(state.gateExpiries).toEqual([]);
              expect(state.steps.filter((step) => step.failed)).toEqual([]);
              return (
                state.events.some((event) => event.kind === "attackEnded") &&
                state.queueIdle &&
                state.pendingSteps === 0 &&
                state.board?.live.stateVersion === state.board?.displayed.stateVersion
              );
            },
            { timeout: 40_000 },
          )
          .toBe(true);
        const state = await lab.read();
        expect(state.board!.live.players[0]!.battleArea.some((p) => p.topCard.cardId === scenario.attackerCardId)).toBe(
          scenario.attackerRemains,
        );
        expect(state.board!.live.players[1]!.battleArea.some((p) => p.topCard.cardId === scenario.defenderCardId)).toBe(
          scenario.defenderRemains,
        );
        expect(state.events.filter((event) => event.kind === "securityChecked")).toHaveLength(scenario.securityRemoved);
        expect(state.board!.visible.players[1]!.securityCount).toBe(
          before.board!.visible.players[1]!.securityCount - scenario.securityRemoved,
        );
        expect(state.board!.visible.players[0]!.securityCount).toBe(
          before.board!.visible.players[0]!.securityCount - (scenario.ownSecurityRemoved ?? 0),
        );
        if (scenario.decision?.kind === "Alliance") {
          expect(
            state.board!.live.players[0]!.battleArea.find((p) => p.permanentId === "dev-perm-0-keyword-ally-0")
              ?.isSuspended,
          ).toBe(scenario.decision.accept);
          expect(
            state.board!.live.players[0]!.battleArea.find((p) => p.permanentId === "dev-perm-0-keyword-ally-1")
              ?.isSuspended,
          ).toBe(false);
        }
        await expect(lab.button(/END PHASE/i)).toBeEnabled();
        const capture = await finishPacingCapture(page);
        await info.attach("real-keyword-pacing.json", {
          body: Buffer.from(JSON.stringify({ scenario, speed, format, capture, state }, null, 2)),
          contentType: "application/json",
        });
        expect(capture.truncated || state.truncated).toBe(false);
        expect(capture.motion.captureQuality).toBe("usable");
        if (scenario.decision) {
          expect(
            capture.decisions.some(
              (decision) =>
                decision.label === (scenario.decision!.kind === "Alliance" ? "Alliance window" : "＜Barrier＞") &&
                decision.closedAt !== undefined,
            ),
          ).toBe(true);
        }
        if (scenario.decision?.kind === "Barrier") {
          const decision = capture.decisions.find((item) => item.label === "＜Barrier＞")!;
          const blows = capture.motion.animations.filter((animation) => animation.name === "battle-claw");
          expect(blows).toHaveLength(format.reduced ? 0 : 1);
          for (const blow of blows) {
            expect(blow.cutShort).toBe(false);
            expect(blow.lastAt).toBeLessThanOrEqual(decision.openedAt);
          }
          expect(
            state.steps.filter((step) => step.stepId.startsWith("field-clash-") && step.phase === "started"),
          ).toHaveLength(1);
        }
        expect(errors).toEqual([]);
        expectOnlyCompletedDpReplacements(state.steps);
      });
    }
  }

  for (const scenario of KEYWORD_TURN_PACING_SCENARIOS) {
    for (const format of [
      { name: "desktop", width: 1440, height: 1000, speed: "normal", reduced: false },
      { name: "desktop", width: 1440, height: 1000, speed: "fast", reduced: false },
      { name: "phone", width: 320, height: 844, speed: "normal", reduced: false },
      { name: "reduced motion", width: 1440, height: 1000, speed: "normal", reduced: true },
    ]) {
      test(`real keyword pacing: ${scenario.id} (${format.name}, ${format.speed})`, async ({ page }, info) => {
        await page.setViewportSize({ width: format.width, height: format.height });
        await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const lab = new EffectsLabPage(page);
        await lab.start(scenario.id, false, format.speed);
        await expect.poll(async () => (await lab.read()).queueIdle).toBe(true);
        await startPacingCapture(page);
        const actions: { label: string; observedAt: number }[] = [];
        const mark = async (label: string) =>
          actions.push({ label, observedAt: await page.evaluate(() => performance.now()) });
        if (scenario.flow === "reboot") {
          for (let index = 0; index < 3; index++) {
            await mark(`attack-${index}`);
            await new GamePage(page).attack(
              `dev-perm-0-keyword-reboot-${index}`,
              page.locator(`[data-drop="perm-opp"][data-id="dev-perm-1-keyword-reboot-target-${index}"]`),
            );
            await expect
              .poll(
                async () => {
                  const state = await lab.read();
                  return (
                    state.events.filter((event) => event.kind === "attackEnded").length === index + 1 && state.queueIdle
                  );
                },
                { timeout: 40_000 },
              )
              .toBe(true);
          }
          expect((await lab.read()).board!.visible.players[0]!.battleArea.map((card) => card.isSuspended)).toEqual([
            true,
            true,
            true,
          ]);
        }
        await mark("end-turn");
        await lab.button(/END PHASE/i).click();
        if (scenario.flow === "block") {
          const prompt = page.getByRole("region", { name: "Block window", exact: true });
          await expect(prompt).toBeVisible({ timeout: 40_000 });
          await waitForDecisionPaint(page, "Block window");
          await mark(scenario.accept ? "declare-block" : "decline-block");
          if (scenario.accept)
            await page.locator('[data-drop="perm-you"][data-id="dev-perm-0-keyword-blocker"]').click();
          else await prompt.getByRole("button", { name: "Take the attack, no block", exact: true }).click();
          await expect
            .poll(
              async () => {
                const state = await lab.read();
                return (
                  state.events.some((event) => event.kind === "attackEnded") &&
                  state.queueIdle &&
                  state.board?.live.stateVersion === state.board?.displayed.stateVersion
                );
              },
              { timeout: 40_000 },
            )
            .toBe(true);
        } else {
          // Observe the opponent's phase, before a later own turn can untap the control.
          await expect
            .poll(
              async () => {
                const state = await lab.read();
                const cards = state.board?.visible.players[0]?.battleArea;
                return (
                  state.board?.visible.turn?.seat === 1 &&
                  cards?.length === 3 &&
                  cards.every((card, index) => card.isSuspended === (index === 2))
                );
              },
              { timeout: 40_000 },
            )
            .toBe(true);
          const second = page.locator(
            '[data-drop="perm-you"][data-id="dev-perm-0-keyword-reboot-1"] .game-card-enter > [data-state]',
          );
          await expect
            .poll(() => second.evaluate((element) => Number.parseFloat(getComputedStyle(element).rotate)))
            .toBe(0);
        }
        const capture = await finishPacingCapture(page);
        const state = await lab.read();
        await info.attach("real-keyword-pacing.json", {
          body: Buffer.from(
            JSON.stringify({ scenario, format, speed: format.speed, actions, capture, state }, null, 2),
          ),
          contentType: "application/json",
        });
        expect(capture.truncated || state.truncated).toBe(false);
        expect(capture.motion.captureQuality).toBe("usable");
        expect(state.gateExpiries).toEqual([]);
        expect(state.steps.filter((step) => step.failed || step.cancelled)).toEqual([]);
        expect(errors).toEqual([]);
        if (scenario.flow === "block") {
          expect(
            state.board!.visible.players[0]!.battleArea.some(
              (card) => card.permanentId === "dev-perm-0-keyword-blocker",
            ),
          ).toBe(!scenario.accept);
          expect(state.board!.visible.players[0]!.securityCount).toBe(scenario.accept ? 5 : 4);
          expect(state.events.filter((event) => event.kind === "blocked")).toHaveLength(scenario.accept ? 1 : 0);
          expect(
            capture.decisions.some((decision) => decision.label === "Block window" && decision.closedAt !== undefined),
          ).toBe(true);
          const blows = capture.motion.animations.filter((animation) => animation.name === "battle-claw");
          expect(blows).toHaveLength(format.reduced ? 0 : 1);
          expect(blows.every((blow) => !blow.cutShort)).toBe(true);
          const securityArrow = capture.arrows.find(
            (arrow) => arrow.source === "dev-perm-1-keyword-attacker" && arrow.target === "security-you",
          );
          expect(securityArrow).toBeDefined();
          const blockerArrow = capture.arrows.find(
            (arrow) => arrow.source === "dev-perm-1-keyword-attacker" && arrow.target === "dev-perm-0-keyword-blocker",
          );
          if (scenario.accept && !format.reduced) {
            expect(blockerArrow?.key).toBe(securityArrow!.key);
            expect(blockerArrow!.at).toBeGreaterThan(securityArrow!.at);
            expect(blockerArrow!.at).toBeLessThanOrEqual(blows[0]!.firstAt);
          } else if (!scenario.accept) expect(blockerArrow).toBeUndefined();
        } else {
          const unsuspended = capture.boards.find(
            (board) =>
              board.turnSeat === 1 &&
              !board.suspendedIds.includes("dev-perm-0-keyword-reboot-0") &&
              !board.suspendedIds.includes("dev-perm-0-keyword-reboot-1"),
          );
          expect(unsuspended?.suspendedIds).toContain("dev-perm-0-keyword-reboot-2");
          expect(state.events.filter((event) => event.kind === "attackEnded")).toHaveLength(3);
          expect(
            state.events.some(
              (event) => event.kind === "phaseChanged" && event.phase === "Active" && event.turnSeat === 1,
            ),
          ).toBe(true);
          const ribbon = capture.phaseRibbons.find((phase) => /unsuspend/i.test(phase.label));
          if (!format.reduced) {
            expect(ribbon).toBeDefined();
            expect(unsuspended!.at).toBeGreaterThanOrEqual(ribbon!.at);
            for (let index = 0; index < 2; index++) {
              const rotation = capture.timings.find(
                (timing) =>
                  timing.permanentId === `dev-perm-0-keyword-reboot-${index}` &&
                  timing.at >= ribbon!.at &&
                  timing.properties.includes("rotate") &&
                  timing.duration === 200,
              );
              expect(rotation?.delayMs).toBe(index * 60);
              const poses = capture.poses.filter(
                (pose) => pose.permanentId === `dev-perm-0-keyword-reboot-${index}` && pose.at >= ribbon!.at,
              );
              expect(poses.some((pose) => pose.angle > 1 && pose.angle < 89)).toBe(true);
              expect(poses.at(-1)?.angle).toBe(0);
            }
          } else {
            expect(
              capture.timings.filter((timing) => timing.properties.includes("rotate") && timing.duration === 200),
            ).toEqual([]);
          }
          const controlPoses = capture.poses.filter(
            (pose) => pose.permanentId === "dev-perm-0-keyword-reboot-2" && pose.at >= unsuspended!.at,
          );
          expect(controlPoses.length).toBeGreaterThan(0);
          expect(controlPoses.every((pose) => pose.angle === 90)).toBe(true);
        }
      });
    }
  }

  for (const scenario of KEYWORD_PROTECTION_PACING_SCENARIOS) {
    for (const format of [
      { name: "desktop", width: 1440, height: 1000, speed: "normal", reduced: false },
      { name: "desktop", width: 1440, height: 1000, speed: "fast", reduced: false },
      { name: "phone", width: 320, height: 844, speed: "normal", reduced: false },
      { name: "reduced motion", width: 1440, height: 1000, speed: "normal", reduced: true },
    ]) {
      test(`real keyword pacing: ${scenario.id} (${format.name}, ${format.speed})`, async ({ page }, info) => {
        await page.setViewportSize({ width: format.width, height: format.height });
        await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const lab = new EffectsLabPage(page);
        await lab.start(scenario.id, false, format.speed);
        await expect.poll(async () => (await lab.read()).queueIdle).toBe(true);
        await startPacingCapture(page);
        const actions = [{ label: "attack", observedAt: await page.evaluate(() => performance.now()) }];
        await new GamePage(page).attack(
          scenario.flow === "evade" ? "dev-perm-0-keyword-attacker" : "dev-perm-0-keyword-protected",
          scenario.flow === "evade"
            ? page.locator('[data-drop="opp-security"]')
            : page.locator('[data-drop="perm-opp"][data-id="dev-perm-1-keyword-defender"]'),
        );
        let label: string;
        if (scenario.flow === "evade") {
          label = "＜Evade＞";
          const prompt = page.getByRole("region", { name: label, exact: true });
          await expect(prompt).toBeVisible();
          await waitForDecisionPaint(page, label);
          actions.push({
            label: scenario.accept ? "accept-evade" : "decline-evade",
            observedAt: await page.evaluate(() => performance.now()),
          });
          await prompt
            .getByRole("button", {
              name: scenario.accept ? "Yes, suspend to evade" : "No, let it be deleted",
              exact: true,
            })
            .click();
        } else {
          await expect.poll(async () => (await lab.read()).decision?.kind).toBe("selectCards");
          const prompt = page.locator('[data-testid="board-prompt"], [role="dialog"]').filter({ visible: true }).last();
          await expect(prompt).toBeVisible();
          label = (await prompt.getAttribute("aria-label"))!;
          expect(["Confirm targets", "Flamedramon · effect"]).toContain(label);
          await waitForDecisionPaint(page, label);
          actions.push({
            label: scenario.accept ? "accept-armor-purge" : "decline-armor-purge",
            observedAt: await page.evaluate(() => performance.now()),
          });
          if (scenario.accept) {
            if ((await prompt.getAttribute("role")) === "dialog")
              await prompt.getByRole("button", { name: /^Flamedramon/ }).click();
            else {
              const art = page
                .locator('[data-drop="perm-you"][data-id="dev-perm-0-keyword-protected"]')
                .locator('[title="Flamedramon"][data-state]');
              // Field badges overlap small suspended cards. Find exposed art using real hit testing.
              const position = await art.evaluate((element) => {
                const bounds = element.getBoundingClientRect();
                for (const [x, y] of [
                  [0.85, 0.35],
                  [0.5, 0.5],
                  [0.25, 0.75],
                ]) {
                  const point = { x: bounds.width * x!, y: bounds.height * y! };
                  const hit = document.elementFromPoint(bounds.left + point.x, bounds.top + point.y);
                  if (hit && element.contains(hit) && !hit.closest("[data-badge-hint], button")) return point;
                }
                return null;
              });
              expect(position, "the target card has exposed clickable art").not.toBeNull();
              await art.click({ position: position! });
            }
            await prompt.getByRole("button", { name: "Confirm targets", exact: true }).click();
          } else await prompt.getByRole("button", { name: /^(Pass|None)$/ }).click();
        }
        await expect
          .poll(
            async () => {
              const state = await lab.read();
              expect(state.gateExpiries).toEqual([]);
              expect(state.steps.filter((step) => step.failed || step.phase === "dropped")).toEqual([]);
              return (
                state.events.some((event) => event.kind === "attackEnded") &&
                state.queueIdle &&
                state.pendingSteps === 0 &&
                state.board?.live.stateVersion === state.board?.displayed.stateVersion
              );
            },
            { timeout: 40_000 },
          )
          .toBe(true);
        const capture = await finishPacingCapture(page);
        const state = await lab.read();
        await info.attach("real-keyword-pacing.json", {
          body: Buffer.from(
            JSON.stringify({ scenario, format, speed: format.speed, actions, capture, state }, null, 2),
          ),
          contentType: "application/json",
        });
        await info.attach("protected-field.png", { body: await page.screenshot(), contentType: "image/png" });
        expect(errors).toEqual([]);
        expect(capture.truncated || state.truncated).toBe(false);
        expect(capture.motion.captureQuality).toBe("usable");
        expectOnlyCompletedDpReplacements(state.steps);
        const holder = state.board!.visible.players[0]!.battleArea.find(
          (card) => card.permanentId === "dev-perm-0-keyword-protected",
        );
        expect(Boolean(holder)).toBe(scenario.accept);
        if (holder) expect(holder.isSuspended).toBe(true);
        expect(state.board!.visible.players[1]!.securityCount).toBe(scenario.flow === "evade" ? 4 : 5);
        const decision = capture.decisions.find(
          (candidate) => candidate.label === label && candidate.closedAt !== undefined,
        );
        expect(decision).toBeDefined();
        const blows = capture.motion.animations.filter((animation) => animation.name === "battle-claw");
        if (scenario.flow === "evade") {
          expect(blows).toHaveLength(0);
          const turns = capture.timings.filter(
            (timing) =>
              timing.permanentId === "dev-perm-0-keyword-protected" &&
              timing.duration === 200 &&
              timing.properties.includes("rotate"),
          );
          expect(turns).toHaveLength(scenario.accept && !format.reduced ? 1 : 0);
          if (holder) expect(holder.topCard.cardId).toBe("BT14-021");
        } else {
          expect(blows).toHaveLength(format.reduced ? 0 : 1);
          expect(blows.every((blow) => !blow.cutShort && blow.lastAt <= decision!.openedAt)).toBe(true);
          if (holder) {
            expect(holder.topCard.cardId).toBe("BT1-009");
            expect(holder.currentDP).toBe(6000);
          }
          const peels = capture.peels.filter(
            (peel) => peel.permanentId === "dev-perm-0-keyword-protected" && peel.cardId === "BT8-012",
          );
          if (scenario.accept && !format.reduced) {
            expect(peels).toHaveLength(1);
            expect(peels[0]!.frames).toBeGreaterThan(2);
            const peelClocks = capture.motion.animations.filter((animation) =>
              animation.name.startsWith("battle-stack-strip-"),
            );
            expect(peelClocks.map((animation) => animation.name).sort()).toEqual([
              "battle-stack-strip-fade",
              "battle-stack-strip-lift",
              "battle-stack-strip-rim",
              "battle-stack-strip-sway",
            ]);
            // The authored source-removal recipe is 170 +85 +170 +170 ms.
            expect(
              peelClocks.every(
                (animation) => animation.durationMs === 595 && !animation.cutShort && !animation.undersampled,
              ),
            ).toBe(true);
            expect(peels[0]!.firstAt).toBeGreaterThanOrEqual(decision!.closedAt!);
            const promoted = capture.boards.find((board) =>
              board.permanents.some(
                (permanent) =>
                  permanent.permanentId === "dev-perm-0-keyword-protected" && permanent.cardId === "BT1-009",
              ),
            );
            expect(promoted).toBeDefined();
            expect(promoted!.at).toBeGreaterThanOrEqual(peels[0]!.lastAt);
            const promotedArt = capture.poses.find(
              (pose) => pose.permanentId === "dev-perm-0-keyword-protected" && pose.cardName === "Monodramon",
            );
            expect(promotedArt).toBeDefined();
            expect(promotedArt!.at).toBeGreaterThanOrEqual(peels[0]!.lastAt);
            expect(
              capture.poses.some(
                (pose) =>
                  pose.permanentId === "dev-perm-0-keyword-protected" &&
                  pose.cardName === "Flamedramon" &&
                  pose.at >= peels[0]!.firstAt,
              ),
            ).toBe(true);
          } else expect(peels).toHaveLength(0);
        }
      });
    }
  }

  const groupFormats = [
    { name: "desktop", width: 1440, height: 1000, reduced: false },
    { name: "phone", width: 320, height: 844, reduced: false },
    { name: "tablet", width: 768, height: 1000, reduced: false },
    { name: "compact desktop", width: 1024, height: 1000, reduced: false },
    { name: "landscape", width: 844, height: 390, reduced: false },
    { name: "reduced motion", width: 1440, height: 1000, reduced: true },
  ];
  for (const format of groupFormats) {
    test(`real group pacing: activate, split and merge (${format.name})`, async ({ page }, info) => {
      await page.setViewportSize({ width: format.width, height: format.height });
      await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
      await page.addInitScript(() => localStorage.setItem("aegis.field-layout", "organized"));
      const lab = new EffectsLabPage(page);
      await lab.start("effects-lab-field-grouping", false);
      await expect(page.getByRole("button", { name: "Izzy Izumi (2 copies)", exact: true })).toBeVisible();
      await startPacingCapture(page);
      for (let index = 0; index < 2; index++) {
        await page.locator(`[data-drop="perm-you"][data-id="dev-perm-0-group-izzy-${index}"]`).click();
        await page.getByRole("button", { name: /^Activate effect:/i }).click();
        const decision = page.getByRole("dialog", { name: "Izzy Izumi · effect", exact: true });
        await expect(decision).toBeVisible();
        await decision.getByRole("button", { name: /^Agumon$/i }).click();
        await decision.getByRole("button", { name: /^Confirm targets$/i }).click();
        await expect
          .poll(
            async () => {
              const state = await lab.read();
              expect(state.gateExpiries).toEqual([]);
              return (
                state.queueIdle &&
                state.pendingSteps === 0 &&
                state.events.filter((event) => event.kind === "effectResolved").length >= index + 1
              );
            },
            { timeout: 30_000 },
          )
          .toBe(true);
      }
      await expect(page.getByRole("button", { name: "Izzy Izumi (2 copies, Suspended)", exact: true })).toBeVisible();
      if (!format.reduced)
        await expect
          .poll(() =>
            page.evaluate(() =>
              (window as unknown as { __keywordPacingCapture: { timings: { returning: boolean }[] } })[
                "__keywordPacingCapture"
              ].timings.some((item) => item.returning),
            ),
          )
          .toBe(true);
      await expect(page.getByTestId("field-group-return")).toHaveCount(0);
      const capture = await finishPacingCapture(page);
      const state = await lab.read();
      await info.attach("real-group-pacing.json", {
        body: Buffer.from(JSON.stringify({ format, capture, state }, null, 2)),
        contentType: "application/json",
      });
      await info.attach("grouped-field.png", { body: await page.screenshot(), contentType: "image/png" });
      expect(capture.truncated).toBe(false);
      expect(capture.motion.captureQuality).toBe("usable");
      if (format.reduced) {
        expect(capture.timings.some((timing) => timing.returning)).toBe(false);
        return;
      }
      const turns = capture.timings.filter(
        (timing) => timing.properties.includes("rotate") && !timing.properties.includes("translate"),
      );
      expect(turns.length).toBeGreaterThan(0);
      expect(turns.every((timing) => timing.duration === 200)).toBe(true);
      const returns = capture.poses.filter((pose) => pose.returning);
      expect(returns.length).toBeGreaterThan(2);
      const lastReturn = returns.at(-1)!;
      const firstReturn = returns.find((pose) => pose.returnId === lastReturn.returnId)!;
      expect(Math.hypot(lastReturn.x - firstReturn.x, lastReturn.y - firstReturn.y)).toBeGreaterThan(10);
      const destination = capture.poses.find(
        (pose) => !pose.returning && pose.at === lastReturn.at && pose.fieldKey === lastReturn.fieldKey,
      );
      expect(destination, "return artwork must reach its surviving physical group").toBeDefined();
      expect(Math.hypot(lastReturn.x - destination!.x, lastReturn.y - destination!.y)).toBeLessThan(3);
    });
  }

  for (const phone of [false, true])
    test(`the opponent's hand play reveals then lands before On Play (${phone ? "phone" : "desktop"})`, async ({
      page,
    }, info) => {
      if (phone) await page.setViewportSize({ width: 390, height: 844 });
      const lab = new EffectsLabPage(page);
      await lab.start("effects-lab-opponent-play");
      await lab.captureArrival("BT1-029", info);
      if (phone) await page.getByRole("button", { name: "Show the full notice", exact: true }).click();
      await expect
        .poll(
          async () => {
            const observed = await lab.read();
            expect(observed.gateExpiries).toEqual([]);
            expect(observed.truncated).toBe(false);
            return (
              observed.events.some((event) => event.kind === "effectResolved" && event.sourceCardId === "BT1-029") &&
              observed.queueIdle &&
              observed.pendingSteps === 0 &&
              observed.board?.live.stateVersion === observed.board?.displayed.stateVersion
            );
          },
          { timeout: 30_000, intervals: [50, 100, 200] },
        )
        .toBe(true);
      const observed = await lab.read();
      expect(
        observed.board?.visible.players[1]?.battleArea.some((permanent) => permanent.topCard.cardId === "BT1-029"),
        "the confirmed opponent play must remain on the rendered field",
      ).toBe(true);
      expect(observed.steps.filter((step) => step.failed || step.phase === "dropped" || step.cancelled)).toEqual([]);
      const visual = await page.evaluate(() => {
        const globals = window as unknown as {
          __labArrivals: Map<string, ArrivalPaint>;
          __labFocusAt: Map<string, number>;
          __labNoticeAt: Map<string, number>;
        };
        return {
          arrivals: [...globals.__labArrivals.values()],
          focusAt: globals.__labFocusAt.get("BT1-029"),
          notices: Object.fromEntries(globals.__labNoticeAt),
        };
      });
      const played = visual.arrivals.find((arrival) => arrival.cardId === "BT1-029");
      expect(played?.revealAt).toBeDefined();
      expect(played?.revealExitAt).toBeGreaterThan(played!.revealAt!);
      expect(played?.landingAt).toBeGreaterThanOrEqual(played!.revealExitAt!);
      expect(played!.revealExitAt! - played!.revealAt!).toBeGreaterThan(500);
      expect(played!.revealExitAt! - played!.revealAt!).toBeLessThan(750);
      expect(visual.focusAt).toBeGreaterThan(played!.landingAt!);
      const clause = observed.steps.find(
        (step) =>
          step.phase === "started" &&
          step.timing === "OnPlay" &&
          step.sourceCardId === "BT1-029" &&
          step.stepId.startsWith("narration-step-"),
      );
      expect(clause, "the On Play effect never started its narration").toBeDefined();
      expect(visual.notices[clause!.stepId.slice("narration-step-".length)]).toBeGreaterThan(played!.landingAt!);
    });

  for (const flow of [
    { accept: true, phone: false },
    { accept: true, phone: true },
    { accept: false, phone: false },
  ]) {
    const { accept, phone } = flow;
    test(`a played card activates optional watchers only after consent (${accept ? "accept" : "decline"}, ${phone ? "phone" : "desktop"})`, async ({
      page,
    }, info) => {
      if (phone) await page.setViewportSize({ width: 390, height: 844 });
      const lab = new EffectsLabPage(page);
      await lab.start("arena-drasil-optional-effect-presets", false);
      await new GamePage(page).play(/^dracmon$/i);
      await lab.captureArrival("BT23-062", info);
      await page.getByRole("button", { name: "Select all, top to bottom", exact: true }).click();
      await page.getByRole("button", { name: "Resolve in this order", exact: true }).click();
      for (let index = 0; index < 2; index++) {
        await expect(page.getByRole("button", { name: "Use", exact: true })).toBeVisible();
        const before = await lab.read();
        expect(
          before.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT23-072"),
        ).toHaveLength(accept ? index : 0);
        if (index === 0) {
          await expect(page.locator('[data-testid="effect-focus"][data-source-card-id="BT23-072"]')).toHaveCount(0);
          await expect(page.locator("[data-narration-id]").filter({ hasText: "King Drasil" })).toHaveCount(0);
        }
        if (accept && index === 1) {
          if (phone) await page.locator(".narration-peek").click();
          const accepted = page.locator("[data-narration-id]").filter({ hasText: "King Drasil" });
          await expect(accepted).toHaveCount(1);
          await expect(accepted).toBeVisible();
          const occurrence = await accepted.getAttribute("data-narration-id");
          const readingStartedAt = await page.evaluate(
            (id) => (window as unknown as { __labNoticeAt: Map<string, number> }).__labNoticeAt.get(id),
            occurrence!,
          );
          expect(readingStartedAt, "the accepted notice must have painted before its reading clock").toBeDefined();
          await page.waitForFunction((startedAt) => performance.now() - startedAt >= 5500, readingStartedAt!);
          await expect(accepted).toHaveAttribute("data-narration-id", occurrence!);
          await expect(accepted).toBeVisible();
          if (!phone) {
            const lane = await page.locator('[data-slot="narration-text"]').boundingBox();
            const prompt = await page.locator(".board-prompt").boundingBox();
            expect(lane!.y + lane!.height).toBeLessThanOrEqual(prompt!.y);
          }
        }
        if (accept && index === 0) {
          if (phone) await page.getByRole("button", { name: /^view board$/i }).click();
          await page.getByRole("button", { name: "‹", exact: true }).click();
          if (phone) await page.getByRole("button", { name: "Return to decision", exact: true }).click();
        }
        await page.getByRole("button", { name: accept ? "Use" : "Don't use", exact: true }).click();
        if (accept && index === 0) {
          expect(
            before.decision?.sourcePermanentId,
            "the accepted watcher must name its physical source",
          ).toBeDefined();
          await lab.captureFocus("BT23-072", before.decision!.sourcePermanentId!, info);
        }
      }
      if (accept) {
        // The first notice has already been read for 5.5 seconds. Its independent
        // lifetime can expire during the second source focus; both accepted clauses
        // must still paint, each with its own occurrence, without extending that clock.
        await expect
          .poll(async () => {
            const observed = await lab.read();
            const clauses = observed.steps.filter(
              (step) =>
                step.phase === "started" &&
                step.sourceCardId === "BT23-072" &&
                step.stepId.startsWith("narration-step-"),
            );
            return new Set(clauses.map((step) => step.stepId)).size;
          })
          .toBe(2);
        const observed = await lab.read();
        const clauseIds = [
          ...new Set(
            observed.steps
              .filter(
                (step) =>
                  step.phase === "started" &&
                  step.sourceCardId === "BT23-072" &&
                  step.stepId.startsWith("narration-step-"),
              )
              .map((step) => step.stepId.slice("narration-step-".length)),
          ),
        ];
        await expect
          .poll(() =>
            page.evaluate((ids) => {
              const painted = (window as unknown as { __labPaintedNotices: Set<string> }).__labPaintedNotices;
              return ids.every((id) => painted.has(id));
            }, clauseIds),
          )
          .toBe(true);
      }
      await expect
        .poll(
          async () => {
            const observed = await lab.read();
            const drasil =
              observed.board?.visible.players[0]?.battleArea.filter(
                (permanent) => permanent.topCard.cardId === "BT23-072",
              ) ?? [];
            return (
              observed.queueIdle &&
              observed.pendingSteps === 0 &&
              observed.board?.live.pendingDecision === undefined &&
              drasil.length === 2 &&
              drasil.every((permanent) => permanent.isSuspended === accept)
            );
          },
          { timeout: 30_000, intervals: [50, 100, 200] },
        )
        .toBe(true);
      const after = await lab.read();
      expect(after.truncated).toBe(false);
      expect(
        after.events.filter((event) => event.kind === "effectTriggered" && event.sourceCardId === "BT23-072"),
      ).toHaveLength(accept ? 2 : 0);
      expect(after.gateExpiries).toEqual([]);
      expect(after.steps.filter((step) => step.failed || step.phase === "dropped" || step.cancelled)).toEqual([]);
      const visual = await page.evaluate(() => {
        const globals = window as unknown as {
          __labArrivals: Map<string, ArrivalPaint>;
          __labFocusAt: Map<string, number>;
        };
        return { arrivals: [...globals.__labArrivals.values()], focusAt: globals.__labFocusAt.get("BT23-072") };
      });
      const played = visual.arrivals.find((arrival) => arrival.cardId === "BT23-062");
      expect(played?.revealAt, "the played hand card never painted its reveal").toBeDefined();
      expect(played?.revealExitAt).toBeGreaterThan(played!.revealAt!);
      expect(played?.landingAt, "the played hand card never painted its landing").toBeGreaterThanOrEqual(
        played!.revealExitAt!,
      );
      if (accept)
        expect(visual.focusAt, "the accepting watcher focused before the play landed").toBeGreaterThan(
          played!.landingAt!,
        );
      if (!accept) {
        await expect(page.locator("[data-narration-id]").filter({ hasText: "King Drasil" })).toHaveCount(0);
        const focused = await page.evaluate(() => [
          ...(window as unknown as { __labFocusedSources: Set<string> }).__labFocusedSources,
        ]);
        expect(focused).not.toContain("BT23-072");
      }
    });
  }

  const formats = [
    { name: "desktop", viewport: { width: 1440, height: 1000 }, reduced: false },
    { name: "phone", viewport: { width: 390, height: 844 }, reduced: false },
    { name: "reduced motion", viewport: { width: 1440, height: 1000 }, reduced: true },
  ];
  for (const phone of [false, true]) {
    test(`a repeated Tamer reveals and lights its physical card before grouping (${phone ? "phone" : "desktop"})`, async ({
      page,
    }) => {
      if (phone) await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(() => {
        localStorage.setItem("aegis:locale", "en");
        localStorage.setItem("aegis.field-layout", "organized");
      });
      await page.goto("/dev/battle?scenario=field-grouping");
      await new GamePage(page).endBreeding();
      const row = page.locator(".game-battle-row--you");
      await expect(row.getByRole("button", { name: "Izzy Izumi (3 copies)", exact: true })).toBeVisible();
      await page.evaluate(() => {
        const globals = window as unknown as {
          __groupedArrival?: {
            permanentId: string;
            target: { x: number; y: number };
            landing?: { x: number; y: number };
          };
        };
        const observe = () => {
          const landing = document.querySelector<HTMLElement>(
            '[data-testid="confirmed-play-landing"][data-card-id="BT1-088"]',
          );
          if (landing) {
            const art = landing.querySelector("img")!.getBoundingClientRect();
            const fieldArt = landing
              .closest("[data-id]")
              ?.querySelector<HTMLElement>("[data-state]")
              ?.getBoundingClientRect();
            if (fieldArt)
              globals["__groupedArrival"] = {
                permanentId: landing.dataset.permanentId!,
                target: { x: fieldArt.left + fieldArt.width / 2, y: fieldArt.top + fieldArt.height / 2 },
                landing: { x: art.left + art.width / 2, y: art.top + art.height / 2 },
              };
          }
          requestAnimationFrame(observe);
        };
        observe();
      });
      await new GamePage(page).play(/^izzy izumi$/i);
      await expect(row.locator('[data-testid="confirmed-play-landing"][data-card-id="BT1-088"]')).toBeVisible();
      await expect(row.getByRole("button", { name: "Izzy Izumi (4 copies)", exact: true })).toBeVisible();
      const arrival = await page.evaluate(
        () =>
          (
            window as unknown as {
              __groupedArrival?: {
                permanentId: string;
                target: { x: number; y: number };
                landing?: { x: number; y: number };
              };
            }
          )["__groupedArrival"],
      );
      expect(arrival?.landing, "the newly played physical copy must keep its landing cue").toBeDefined();
      expect(Math.abs(arrival!.landing!.x - arrival!.target.x)).toBeLessThan(3);
      expect(Math.abs(arrival!.landing!.y - arrival!.target.y)).toBeLessThan(3);
    });
  }
  for (const format of formats) {
    test(`the bot chain paints and settles (Stacked, ${format.name})`, async ({ page }) => {
      await page.setViewportSize(format.viewport);
      await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
      const lab = new EffectsLabPage(page);
      await lab.start();
      if (format.name === "desktop") {
        // This chain's short clauses can all fit on a tall desktop. Exercise a smaller
        // toast lane so reading position is tested while actual effects keep arriving.
        await page.addStyleTag({ content: 'html .narration-slot[data-slot="narration-text"] { max-height: 12rem; }' });
        await lab.readEarlierNotices();
      }
      if (format.name === "phone")
        await page.getByRole("button", { name: "Show the full notice", exact: true }).click();
      await lab.finish(format.reduced);
    });
  }
});
