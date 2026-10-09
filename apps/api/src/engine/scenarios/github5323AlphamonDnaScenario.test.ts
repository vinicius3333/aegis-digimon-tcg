import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../../cards/index.js";
import { createEvaluationPolicy } from "../../bot/policy.js";
import { buildBotView } from "../../bot/view.js";
import { layDevScenario } from "../devScenario.js";
import { BLUE_DECK, RED_DECK } from "../testDecks.js";
import { advance } from "../testkit/advance.js";
import { setupEngine, settle } from "../testkit/harness.js";

describe("GitHub #5323 named Alphamon/Ouryumon arenas through the real turn loop", () => {
  it.each(["dna", "paid"] as const)("accepts the printed Main %s route", async (mode) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoSelectCards: true, autoDeclineOptional: true, autoOrderTriggers: true },
    );
    layDevScenario("arena-github-5323-alphamon-main-dna", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const alpha = human.battleArea.find((p) => p.topCard.cardId === "EX13-060")!;
    const ouryu = human.battleArea.find((p) => p.topCard.cardId === "BT20-018")!;
    const ace = human.hand.find((c) => c.cardId === "BT20-060")!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(ace.dnaDigivolveRoutes).toHaveLength(1);
      expect(ace.dnaDigivolveRoutes[0]!.projectedCost).toBe(0);
      expect(ace.digivolveRoutes.some((r) => r.projectedCost === 6)).toBe(true);
      expect(
        s.engine.applyIntent(
          0,
          mode === "dna"
            ? {
                type: "dnaDigivolve",
                instanceId: ace.instanceId,
                materialPermanentIds: [alpha.permanentId, ouryu.permanentId],
              }
            : {
                type: "digivolve",
                instanceId: ace.instanceId,
                permanentId: alpha.permanentId,
              },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.engine.mainVerbContinuationsInFlight === 0 && s.state.pendingDecision === undefined);
      const result = human.battleArea.find((p) => p.topCard.instanceId === ace.instanceId)!;
      expect(result).toBeDefined();
      expect(result.stack.map((c) => c.cardId)).toEqual(mode === "dna" ? ["EX13-060", "BT20-018"] : ["EX13-060"]);
      expect(human.battleArea).toHaveLength(mode === "dna" ? 1 : 2);
      expect(human.security).toHaveLength(mode === "dna" ? 4 : 3);
      expect(opponent.security).toHaveLength(mode === "dna" ? 2 : 3);
      expect(opponent.battleArea).toHaveLength(0);
      expect(s.state.memory).toBe(mode === "dna" ? 10 : 1);
      expect(s.events.some((e) => e.kind === "securityChecked")).toBe(false);
    } finally {
      // The public timer pipeline also cancels a breeding window opened after combat.
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });

  it.each(["activate", "pass"] as const)("resolves the legal Counter window when choosing %s", async (mode) => {
    const s = setupEngine(
      { 0: {}, 1: {} },
      { autoSelectCards: true, autoDeclineOptional: true, autoOrderTriggers: true },
    );
    layDevScenario("arena-github-5323-alphamon-blast-dna", s.state, [BLUE_DECK, RED_DECK]);
    const human = s.state.players[0]!;
    const opponent = s.state.players[1]!;
    const ace = human.hand.find((c) => c.cardId === "BT20-060")!;
    const partner = human.hand.find((c) => c.cardId === "BT20-018")!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(ace.dnaDigivolveRoutes).toHaveLength(0);
      expect(s.engine.applyIntent(0, { type: "respondCounter" })).toEqual({ ok: false, reason: "wrong-phase" });
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      const attack = {
        type: "attack" as const,
        attackerPermanentId: opponent.battleArea[0]!.permanentId,
        target: { kind: "player" as const },
      };
      expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(buildBotView(s.state, 1)!)).toEqual(attack);
      expect(s.engine.applyIntent(1, attack)).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "counterWindowOpened"));
      const opened = s.events.find((e) => e.kind === "counterWindowOpened");
      if (opened?.kind !== "counterWindowOpened") throw new Error("Counter did not open");
      expect(opened.eligibleCounters).toHaveLength(1);
      const choice = opened.eligibleCounters[0]!;
      expect(choice.instanceId).toBe(ace.instanceId);
      expect(
        s.engine.applyIntent(
          0,
          mode === "activate"
            ? {
                type: "respondCounter",
                sourceInstanceId: choice.instanceId,
                effectKey: choice.effectKey,
              }
            : { type: "respondCounter" },
        ),
      ).toEqual({ ok: true });
      await settle(() => s.events.some((e) => e.kind === "attackEnded") && s.state.pendingDecision === undefined);
      const activated = mode === "activate";
      expect(human.battleArea[0]!.topCard.cardId).toBe(activated ? "BT20-060" : "EX13-060");
      expect(human.hand.some((c) => c.instanceId === partner.instanceId)).toBe(!activated);
      expect(human.hand.some((c) => c.instanceId === ace.instanceId)).toBe(!activated);
      expect(human.security).toHaveLength(activated ? 4 : 2);
      expect(opponent.security).toHaveLength(activated ? 2 : 3);
      expect(s.events.some((e) => e.kind === "securityChecked")).toBe(!activated);
      expect(s.events.filter((e) => e.kind === "counterResolved")).toEqual([expect.objectContaining({ activated })]);
      expect(human.battleArea[0]!.stack.map((c) => c.cardId)).toEqual(activated ? ["BT20-018", "EX13-060"] : []);
      expect(opponent.battleArea).toHaveLength(activated ? 0 : 1);
    } finally {
      // The public timer pipeline also cancels a breeding window opened after combat.
      s.engine.expireMatchTimer(s.state.turnSeat);
      await loop;
    }
  });
});
