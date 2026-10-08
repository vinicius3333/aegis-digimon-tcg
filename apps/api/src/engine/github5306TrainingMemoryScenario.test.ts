import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario, type DevScenarioId } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { drainMicrotasks, setupEngine, settle } from "./testkit/harness.js";

describe("GitHub #5306 Treadmill Training current-behavior arenas", () => {
  it("pays 2 before the search, finishes placement, then starts the opponent's turn at 1", async () => {
    const s = setupEngine({ 0: {}, 1: {} });
    layDevScenario("arena-github5306-training-use-memory", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.state.memory).toBe(1);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "github5306-training" })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "selectCards");
      expect(s.state.memory).toBe(-1);
      expect(s.state.turnSeat).toBe(0);
      const request = s.decisions.at(-1)!.req;
      expect(request.options?.candidateInstanceIds).toEqual(["github5306-deck-1"]);
      expect(
        s.engine.applyIntent(0, {
          type: "respondDecision",
          decisionId: request.decisionId,
          response: { kind: "selectCards", instanceIds: ["github5306-deck-1"] },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      const human = s.state.players[0]!;
      // Engine memory is relative to the current turn player and flips when the turn changes.
      expect(s.state.memory).toBe(1);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(human.battleArea.map((p) => p.topCard.cardId)).toEqual(["LM-054"]);
      expect(human.hand.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-051"]);
      expect(human.deck.at(-1)?.cardId).toBe("BT1-013");
      expect(human.trash).toHaveLength(0);
    } finally {
      if (s.state.phase === Phase.Breeding) s.engine.applyIntent(s.state.turnSeat, { type: "endPhase" });
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });

  const delayCases: { scenario: DevScenarioId; evolution: string; choice: number; memory: number }[] = [
    { scenario: "arena-github5306-training-delay-paid", evolution: "BT1-054", choice: 0, memory: 2 },
    { scenario: "arena-github5306-training-delay-free", evolution: "BT1-051", choice: 0, memory: 3 },
    { scenario: "arena-github5306-training-delay-cost-choice", evolution: "EX5-054", choice: 0, memory: 1 },
    { scenario: "arena-github5306-training-delay-cost-choice", evolution: "EX5-054", choice: 1, memory: 2 },
  ];
  it.each(delayCases)(
    "$scenario choice $choice finishes at $memory memory",
    async ({ scenario, evolution, choice, memory }) => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoAcceptOptional: true, autoSelectCards: true, preferOptionIndex: choice },
      );
      layDevScenario(scenario, s.state, [BLUE_DECK, RED_DECK]);
      const training = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "LM-054")!;
      const trainingId = training.topCard.instanceId;
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.memory).toBe(3);
        const [ability] = JSON.parse(training.activatableEffectsJson) as { effectKey: string }[];
        expect(ability).toBeDefined();
        expect(
          s.engine.applyIntent(0, {
            type: "activateEffect",
            sourceInstanceId: trainingId,
            effectKey: ability!.effectKey,
          }),
        ).toEqual({ ok: true });
        await settle(
          () =>
            s.state.players[0]!.battleArea.some((p) => p.topCard.cardId === evolution) &&
            s.state.pendingDecision === undefined,
        );
        await drainMicrotasks();
        expect(s.state.memory).toBe(memory);
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.phase).toBe(Phase.Main);
        const human = s.state.players[0]!;
        expect(human.trash.map((c) => c.instanceId)).toEqual([trainingId]);
        expect(human.hand.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-009"]);
        expect(human.battleArea).toHaveLength(1);
        expect(human.battleArea[0]!.stack.map((c) => c.cardId)).toEqual([
          evolution === "EX5-054" ? "BT14-038" : "BT1-046",
        ]);
        const choices = s.decisions.flatMap(({ req }) => {
          const costChoice = req.options?.digivolveCostChoice;
          return costChoice ? [{ costs: costChoice.costs, costDelta: costChoice.costDelta }] : [];
        });
        expect(choices).toEqual(evolution === "EX5-054" ? [{ costs: [4, 3], costDelta: -2 }] : []);
      } finally {
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    },
  );

  it("declining digivolution after activating Delay preserves 3 memory and the host", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoDeclineOptional: true });
    layDevScenario("arena-github5306-training-delay-paid", s.state, [BLUE_DECK, RED_DECK]);
    const training = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "LM-054")!;
    const trainingId = training.topCard.instanceId;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      const [ability] = JSON.parse(training.activatableEffectsJson) as { effectKey: string }[];
      expect(ability).toBeDefined();
      expect(
        s.engine.applyIntent(0, {
          type: "activateEffect",
          sourceInstanceId: trainingId,
          effectKey: ability!.effectKey,
        }),
      ).toEqual({ ok: true });
      await settle(
        () =>
          s.state.players[0]!.trash.some((c) => c.instanceId === trainingId) && s.state.pendingDecision === undefined,
      );
      await drainMicrotasks();
      expect(s.state.memory).toBe(3);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.phase).toBe(Phase.Main);
      expect(s.state.players[0]!.battleArea.map((p) => p.topCard.cardId)).toEqual(["BT1-046"]);
      expect(s.state.players[0]!.hand.map((c) => c.cardId)).toContain("BT1-054");
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
