import { Phase, type GameState } from "@aegis/shared";
import { expect, it } from "vitest";
import "../../cards/index.js";
import { layDevScenario, type DevScenarioId } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../testkit/harness.js";

async function inScenario(
  id: DevScenarioId,
  exercise: (s: EngineSetup) => Promise<void>,
  declinePrompts: string[] = [],
): Promise<void> {
  const s = setupEngine(
    { 0: {}, 1: {} },
    { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, declinePrompts },
  );
  layDevScenario(id, s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    await exercise(s);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
}

function hand(state: GameState, cardId: string) {
  const instance = state.players[0]!.hand.find((card) => card.cardId === cardId);
  if (!instance) throw new Error(`Missing ${cardId}`);
  return instance;
}

it("GitHub #5063 arena does not reward a Digimon with a buried Tamer", async () => {
  await inScenario("arena-issue-5063-bokomon-base", async (s) => {
    const base = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT7-011")!;
    const memory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: hand(s.state, "BT7-014").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard.cardId === "BT7-014" && !s.state.pendingDecision);
    expect(s.state.memory).toBe(memory - 1);
  });
});

it("GitHub #5059 arena offers the printed Agumon warp through Angewomon", async () => {
  await inScenario("arena-issue-5059-angewomon-warp", async (s) => {
    const base = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "ST20-10")!;
    const memory = s.state.memory;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "ST20-06").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        base.topCard.cardId === "ST20-11" &&
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "ST20-06") &&
        !s.state.pendingDecision,
    );
    expect(s.state.memory).toBe(memory - 7);
  });
});

it("GitHub #5060 arena Security chooses only exactly named Lucemon", async () => {
  await inScenario("arena-issue-5060-exact-lucemon", async (s) => {
    const attacker = s.state.players[0]!.battleArea[0]!;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((e) => e.kind === "attackEnded") && !s.state.pendingDecision);
    expect(s.state.players[1]!.battleArea.map((p) => p.topCard.cardId)).toContain("EX10-013");
    expect(s.state.players[1]!.trash.map((c) => c.cardId)).toContain("BT7-111");
  });
});

it("GitHub #5064 arena leaves the unprotected Hybrid vulnerable to Gaia Force", async () => {
  await inScenario("arena-issue-5064-hybrid-protection", async (s) => {
    const victimId = s.state.players[1]!.battleArea[0]!.permanentId;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "ST1-16").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () => !s.state.players[1]!.battleArea.some((p) => p.permanentId === victimId) && !s.state.pendingDecision,
    );
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });
});

it("GitHub #5050 arena respects immunity in the defending player's Counter", async () => {
  await inScenario(
    "arena-issue-5050-counter-immunity",
    async (s) => {
      const vortex = s.state.players[0]!.battleArea[0]!;
      const gallant = s.state.players[1]!.battleArea[0]!;
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: vortex.permanentId,
          target: { kind: "player" },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
      const opened = s.events.find((e) => e.kind === "counterWindowOpened");
      if (opened?.kind !== "counterWindowOpened") throw new Error("Missing Counter");
      const counter = opened.eligibleCounters.find((c) => c.instanceId === gallant.topCard.instanceId)!;
      expect(
        s.engine.applyIntent(1, {
          type: "respondCounter",
          sourceInstanceId: counter.instanceId,
          effectKey: counter.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "effectActivated" && e.sourceCardId === "EX13-015"));
      expect(s.state.players[0]!.battleArea).toContain(vortex);
      expect(s.state.players[0]!.security).toHaveLength(1);
      await advance(s.engine).finishAttack();
    },
    ["Unsuspend", "Battle"],
  );
});

it("GitHub #5127 arena uses both opposing Digimon for Option reduction", async () => {
  await inScenario("arena-issue-5127-opponent-suspend-cost", async (s) => {
    // Active unsuspends the green source; exclude it so both opposing bodies pay.
    await advance(s.engine).verb.suspend([s.state.players[0]!.battleArea[0]!.permanentId]);
    const memory = s.state.memory;
    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: hand(s.state, "LM-066").instanceId,
        useAs: "option",
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.cardId === "LM-066") && !s.state.pendingDecision);
    expect(s.state.memory).toBe(memory - 4);
    expect(s.state.players[1]!.battleArea.filter((p) => p.topCard.cardId !== "BT1-088")).toHaveLength(1);
    expect(s.state.players[1]!.battleArea.find((p) => p.topCard.cardId !== "BT1-088")!.isSuspended).toBe(true);
    expect(s.state.players[1]!.deck.some((c) => c.cardId === "BT1-010" || c.cardId === "BT1-011")).toBe(true);
  });
});

it("GitHub #5127 arena protects opposing Zephagamon by suspending your Agumon", async () => {
  await inScenario("arena-issue-5127-opponent-survival", async (s) => {
    const payer = s.state.players[0]!.battleArea[0]!;
    const zephagamon = s.state.players[1]!.battleArea[0]!;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "ST1-16").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "ST1-16") && !s.state.pendingDecision,
    );
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === zephagamon.permanentId)).toBe(true);
    expect(payer.isSuspended).toBe(true);
  });
});

it("GitHub #5158 arena resolves both Guilmon X reveal additions", async () => {
  await inScenario("arena-issue-5158-guilmon-x-reveal", async (s) => {
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: hand(s.state, "EX8-009").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.events.some((e) => e.kind === "effectResolved" && e.sourceCardId === "EX8-009") && !s.state.pendingDecision,
    );
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toEqual(expect.arrayContaining(["EX13-010", "BT9-109"]));
  });
});

it("GitHub #5159 arena moves Kudamon without a Tamer and completes reveal resolution", async () => {
  const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoAcceptOptional: true, autoChooseOption: true });
  layDevScenario("arena-issue-5159-kudamon-moving", s.state, [BLUE_DECK, RED_DECK]);
  const loop = s.engine.startTurnLoop();
  try {
    await settle(() => s.state.phase === Phase.Breeding);
    expect(
      s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: s.state.players[0]!.breeding!.permanentId }),
    ).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.breeding).toBeUndefined();
    expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("ST24-06");
    expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["EX13-026"]);
    expect(s.state.pendingDecision).toBeUndefined();
  } finally {
    s.engine.applyIntent(0, { type: "surrender" });
    await loop;
  }
});
