import { spawn, type ChildProcess } from "node:child_process";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { GamePage } from "./game-page";
import { SPOTLIGHT_PADDING_PX, SPOTLIGHT_RADIUS_PX } from "../src/game/spotlight";

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
    phase: string;
    failed: boolean;
    cancelled: boolean;
    timing?: string;
    sourceCardId?: string;
    batchId?: string;
  }[];
  events: {
    kind: string;
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
      players: { battleArea: { topCard: { cardId: string }; isSuspended: boolean; keywords?: string[] }[] }[];
    };
    displayed: { stateVersion: number };
    visible: {
      players: { battleArea: { permanentId: string; topCard: { cardId: string }; isSuspended: boolean }[] }[];
    };
  };
  gateExpiries: string[];
  truncated: boolean;
  counters: { boardBudgetHits: number; decisionBudgetHits: number; decisionStallHits: number };
}
type LabReader = (() => LabState) & { reset(): void };
interface ArrivalPaint {
  cardId: string;
  permanentId: string;
  flightAt?: number;
  landingAt?: number;
  from?: { x: number; y: number };
  to?: { x: number; y: number };
  landedAt?: { x: number; y: number };
}

class EffectsLabPage {
  constructor(readonly page: Page) {}
  button(name: RegExp) {
    return this.page.getByRole("button", { name }).filter({ visible: true });
  }
  async start(style: string, scenario = "effects-lab-opponent-chain", endTurn = true) {
    await this.page.addInitScript(() => {
      localStorage.setItem("aegis:locale", "en");
      localStorage.removeItem("aegis.dev.effects-lab.pacing");
      localStorage.setItem("aegis.effect-speed", "normal");
    });
    await this.page.goto(`/dev/effects-lab?scenario=${scenario}`);
    await expect(this.button(/END BREEDING/i)).toBeEnabled({ timeout: 45_000 });
    await this.page.getByRole("button", { name: style, exact: true }).click();
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
      globals.__labArrivals = new Map<string, ArrivalPaint>();
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
        for (const element of document.querySelectorAll<HTMLElement>(
          '[data-testid="confirmed-play-flight"], [data-testid="confirmed-play-landing"]',
        )) {
          if (element.getBoundingClientRect().width <= 0) continue;
          const { cardId, permanentId, testid } = element.dataset;
          if (!cardId || !permanentId) continue;
          const arrivals = globals.__labArrivals as Map<string, ArrivalPaint>;
          const entry = arrivals.get(permanentId) ?? { cardId, permanentId };
          if (testid === "confirmed-play-flight") {
            entry.flightAt ??= performance.now();
            const board = element.parentElement!.getBoundingClientRect();
            entry.from ??= {
              x: board.left + parseFloat(element.style.left),
              y: board.top + parseFloat(element.style.top),
            };
            entry.to ??= {
              x: entry.from.x + parseFloat(element.style.getPropertyValue("--battle-flight-dx")),
              y: entry.from.y + parseFloat(element.style.getPropertyValue("--battle-flight-dy")),
            };
          } else {
            entry.landingAt ??= performance.now();
            const art = (element.querySelector("img") ?? element).getBoundingClientRect();
            entry.landedAt = { x: art.left + art.width / 2, y: art.top + art.height / 2 };
          }
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
  async captureArrival(cardId: string, info: TestInfo) {
    await expect(this.page.locator(`[data-testid="confirmed-play-flight"][data-card-id="${cardId}"]`)).toBeVisible();
    await this.page.screenshot({ path: info.outputPath("confirmed-play-flight.png") });
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
                const dim = element.querySelector("rect[mask]");
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
                  currentViewBox:
                    Math.abs(viewBox.width - field.width) < 1 && Math.abs(viewBox.height - field.height) < 1,
                  dimmed: Number(dim?.getAttribute("fill-opacity")) > 0,
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

  for (const phone of [false, true])
    test(`the opponent's hand play paints its field flight and landing before On Play (${phone ? "phone" : "desktop"})`, async ({
      page,
    }, info) => {
      if (phone) await page.setViewportSize({ width: 390, height: 844 });
      const lab = new EffectsLabPage(page);
      await lab.start("Stacked", "effects-lab-opponent-play");
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
      expect(played?.flightAt).toBeDefined();
      expect(played?.landingAt).toBeGreaterThan(played!.flightAt!);
      expect(
        Math.hypot(played!.to!.x - played!.from!.x, played!.to!.y - played!.from!.y),
        "the flight must travel to a different field location",
      ).toBeGreaterThan(4);
      expect(
        Math.hypot(played!.to!.x - played!.landedAt!.x, played!.to!.y - played!.landedAt!.y),
        "the flight must land on the printed field card",
      ).toBeLessThan(32);
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
      await lab.start("Stacked", "arena-drasil-optional-effect-presets", false);
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
      expect(played?.flightAt, "the played hand card never painted its flight").toBeDefined();
      expect(played?.landingAt, "the played hand card never painted its landing").toBeGreaterThan(played!.flightAt!);
      expect(Math.hypot(played!.to!.x - played!.from!.x, played!.to!.y - played!.from!.y)).toBeGreaterThan(4);
      expect(
        Math.hypot(played!.to!.x - played!.landedAt!.x, played!.to!.y - played!.landedAt!.y),
        "the own play must land on its printed field card",
      ).toBeLessThan(32);
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
  for (const style of ["Stacked", "Sequential"])
    for (const format of formats) {
      test(`the bot chain paints and settles (${style}, ${format.name})`, async ({ page }) => {
        await page.setViewportSize(format.viewport);
        await page.emulateMedia({ reducedMotion: format.reduced ? "reduce" : "no-preference" });
        const lab = new EffectsLabPage(page);
        await lab.start(style);
        if (format.name === "phone")
          await page.getByRole("button", { name: "Show the full notice", exact: true }).click();
        await lab.finish(format.reduced);
      });
    }
});
