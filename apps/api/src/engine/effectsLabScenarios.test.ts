import { Phase, type DecisionRequest, type Seat } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import type { DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, type EngineSetup, type SetupEngineOptions } from "./testkit/harness.js";

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function startScenario(scenario: DevScenarioId, options: SetupEngineOptions = {}): Promise<EngineSetup> {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoSelectCards: true, autoAcceptOptional: true, declineDigiXros: true, ...options },
  );
  s.engine.stagedDecks[0] = BLUE_DECK;
  s.engine.stagedDecks[1] = RED_DECK;
  s.engine.startDevScenario(scenario);
  await settle(() => s.state.phase === Phase.Breeding);
  expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
  await advance(s.engine).waitForMainPhase(0);
  return s;
}

/** Ticks until `done` holds, passing the bot's breeding phase so its turn can reach main. */
async function runUntil(s: EngineSetup, done: () => boolean): Promise<void> {
  for (let step = 0; step < 600 && !done(); step += 1) {
    if (s.state.pendingDecision === undefined && s.state.phase === Phase.Breeding && s.state.turnSeat === 1) {
      s.engine.applyIntent(1, { type: "endPhase" });
    }
    await tick();
  }
  expect(done()).toBe(true);
}

async function drain(s: EngineSetup): Promise<void> {
  for (let step = 0; step < 400 && s.state.pendingDecision !== undefined; step += 1) await tick();
  for (let step = 0; step < 50; step += 1) await tick();
}

function triggeredCardIds(s: EngineSetup, seat?: Seat, fromEvent = 0): string[] {
  return s.events
    .slice(fromEvent)
    .flatMap((event) =>
      event.kind === "effectTriggered" && (seat === undefined || event.seat === seat) ? [event.sourceCardId] : [],
    );
}

function resolvedCount(s: EngineSetup, fromEvent = 0): number {
  return s.events.slice(fromEvent).filter((event) => event.kind === "effectResolved").length;
}

function orderPrompts(s: EngineSetup, seat: Seat): DecisionRequest[] {
  return s.decisions.filter((entry) => entry.seat === seat && entry.req.kind === "orderTriggers").map(({ req }) => req);
}

function hand(s: EngineSetup, seat: Seat): number {
  return s.state.players[seat]!.hand.length;
}

describe("Effects Lab dev scenarios", () => {
  it("effects-lab-own-chain: one digivolution opens a six-effect resolution plan", async () => {
    const s = await startScenario("effects-lab-own-chain");
    try {
      const human = s.state.players[0]!;
      const golemon = human.battleArea.find((permanent) => permanent.topCard.cardId === "BT10-062")!;
      const megadramon = human.hand.find((card) => card.cardId === "BT9-065")!;
      const handBefore = hand(s, 0);
      const memoryBefore = s.state.memory;
      const firstEvent = s.events.length;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: golemon.permanentId,
          instanceId: megadramon.instanceId,
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const [plan] = orderPrompts(s, 0);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual([
        "BT16-088",
        "BT5-091",
        "BT9-065",
        "EX4-003",
        "EX4-038",
        "EX4-039",
      ]);
      expect(triggeredCardIds(s, 0, firstEvent)).toHaveLength(6);
      expect(resolvedCount(s, firstEvent)).toBe(6);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(hand(s, 0)).toBe(handBefore + 2);
      expect(s.state.memory).toBe(memoryBefore - 4 + 3);
      expect(s.state.pendingDecision).toBeUndefined();
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-opponent-chain: ending the turn lets the bot resolve five start-of-main effects", async () => {
    const s = await startScenario("effects-lab-opponent-chain");
    try {
      const botHandBefore = hand(s, 1);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await runUntil(
        s,
        () => s.state.turnSeat === 1 && s.state.phase === Phase.Main && triggeredCardIds(s, 1).length >= 5,
      );
      await drain(s);

      const [plan] = orderPrompts(s, 1);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual(["BT26-104", "EX8-011", "LM-002", "P-199", "P-200"]);
      expect(triggeredCardIds(s, 1)).toHaveLength(5);
      expect(resolvedCount(s)).toBeGreaterThanOrEqual(5);
      expect(orderPrompts(s, 0)).toHaveLength(0);
      expect(s.state.players[0]!.battleArea[0]!.isSuspended).toBe(true);
      expect(hand(s, 1)).toBe(botHandBefore + 2);
      const tyrannomon = s.state.players[1]!.battleArea.find((permanent) => permanent.topCard.cardId === "EX8-011")!;
      expect(tyrannomon.currentDP).toBeGreaterThanOrEqual(5000 + 3000);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-nested: one attack nests When Attacking, On Deletion and a security On Play", async () => {
    const s = await startScenario("effects-lab-nested");
    try {
      const gallantmon = s.state.players[0]!.battleArea[0]!;
      const botHandBefore = hand(s, 1);
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: gallantmon.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const [plan] = orderPrompts(s, 0);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual(["LM-002", "ST7-09"]);
      expect(triggeredCardIds(s)).toEqual(["ST7-09", "ST7-08", "BT2-070", "LM-002", "BT4-093", "BT4-093"]);
      expect(resolvedCount(s)).toBe(6);
      expect(s.events.filter((event) => event.kind === "securityChecked")).toHaveLength(3);
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT4-093"]);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(hand(s, 1)).toBe(botHandBefore + 2);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-prod-royal-knights: three Cool Boy triggers, then The Last Guardian from security", async () => {
    const s = await startScenario("effects-lab-prod-royal-knights");
    try {
      const human = s.state.players[0]!;
      const zudomon = human.battleArea.find((permanent) => permanent.topCard.cardId === "BT2-027")!;
      const ulforce = human.hand.find((card) => card.cardId === "ST8-10")!;
      const memoryBefore = s.state.memory;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: zudomon.permanentId,
          instanceId: ulforce.instanceId,
        }),
      ).toEqual({ ok: true });
      await drain(s);

      const [plan] = orderPrompts(s, 0);
      expect(plan?.options?.acceptsResolutionPlan).toBe(true);
      expect([...plan!.options!.triggerCardIds!].sort()).toEqual(["BT20-091", "BT20-091", "BT20-091", "ST8-10"]);
      expect(triggeredCardIds(s, 0).filter((cardId) => cardId === "BT20-091")).toHaveLength(3);
      expect(
        human.battleArea.filter(({ isSuspended, topCard }) => topCard.cardId === "BT20-091" && isSuspended),
      ).toHaveLength(3);
      expect(s.state.players[1]!.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(memoryBefore - 4 + 3);

      const royalKnight = human.battleArea.find((permanent) => permanent.topCard.cardId === "ST8-10")!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: royalKnight.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await drain(s);

      expect(triggeredCardIds(s, 1)).toContain("BT20-100");
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId).sort()).toEqual([
        "BT20-091",
        "BT20-100",
      ]);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });

  it("effects-lab-prod-ghost: Execute attack chains Violet Inboots, Soul Banquet, Kunlun and Phantomon", async () => {
    const s = await startScenario("effects-lab-prod-ghost", {
      preferInstanceIds: ["dev-lab-ghost-discard"],
      declinePrompts: ["Digivolve"],
    });
    try {
      const firstEvent = s.events.length;
      advance(s.engine).endMainPhaseIfOpen(0);
      await runUntil(s, () => s.state.turnSeat === 1);
      await drain(s);

      const chain = s.events
        .slice(firstEvent)
        .flatMap((event) =>
          event.kind === "effectTriggered" ? [event.sourceCardId] : event.kind === "securityChecked" ? ["check"] : [],
        );
      expect(chain).toEqual([
        "BT20-072",
        "EX11-068",
        "BT23-098",
        "BT26-104",
        "BT26-104",
        "check",
        "BT20-072",
        "BT20-072",
        "BT20-063",
      ]);
      expect(resolvedCount(s, firstEvent)).toBe(8);
      const human = s.state.players[0]!;
      expect(human.battleArea.some(({ topCard }) => topCard.cardId === "BT20-072")).toBe(false);
      expect(human.battleArea.some(({ topCard }) => topCard.cardId === "BT20-063")).toBe(true);
      expect(human.trash.map(({ cardId }) => cardId)).toEqual(expect.arrayContaining(["BT20-072", "BT23-098"]));
      expect(s.state.players[1]!.battleArea.map(({ topCard }) => topCard.cardId)).toEqual(["BT26-104"]);
      expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toContain("EX12-006");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
    }
  });
});
