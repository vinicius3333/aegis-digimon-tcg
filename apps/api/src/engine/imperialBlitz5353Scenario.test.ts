import { Phase, type Intent, type DecisionResponse } from "@aegis/shared";
import { expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { setupEngine, settle, assertNoLoudGap } from "./testkit/harness.js";

for (const ending of ["attack", "decline", "pass-after-accept"] as const) {
  it(`GitHub #5353 playable arena: Rush attack, inherited end-turn DNA, then ${ending}`, async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoOrderTriggers: true });
    layDevScenario("arena-issue-5353-imperialdramon-nested-blitz", s.state, [BLUE_DECK, RED_DECK]);
    const loop = s.engine.startTurnLoop();
    const act = (intent: Intent, seat: 0 | 1 = 0) => expect(s.engine.applyIntent(seat, intent)).toEqual({ ok: true });
    const field = (cardId: string) => s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === cardId)!;
    const hand = (cardId: string) => s.state.players[0]!.hand.find((c) => c.cardId === cardId)!;
    const answer = async (sourceCardId: string, response: DecisionResponse) => {
      await settle(() => s.state.pendingDecision?.kind === response.kind);
      const pending = s.state.pendingDecision!;
      const req = s.decisions.findLast((d) => d.req.decisionId === pending.decisionId)!.req;
      expect(req.sourceCardId).toBe(sourceCardId);
      act({ type: "respondDecision", decisionId: pending.decisionId, response }, pending.seat);
    };
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      act({ type: "endPhase" });
      await advance(s.engine).waitForMainPhase(0);
      act({
        type: "dnaDigivolve",
        materialPermanentIds: [field("EX3-008").permanentId, field("P-110").permanentId],
        instanceId: hand("BT16-077").instanceId,
      });
      await answer("BT16-077", { kind: "optional", accept: true });
      const pailCard = s.state.players[0]!.trash.find((c) => c.cardId === "BT20-016")!;
      await settle(() => s.state.pendingDecision !== undefined);
      if (s.state.pendingDecision!.kind === "selectCards")
        await answer("BT16-077", { kind: "selectCards", instanceIds: [pailCard.instanceId] });
      await answer("BT16-077", { kind: "optional", accept: true });
      await settle(() => field("BT20-016") !== undefined);
      const pail = field("BT20-016");
      await answer("BT16-077", { kind: "chooseTargets", instanceIds: [pail.permanentId] });
      await answer("BT16-077", { kind: "selectCards", instanceIds: ["player"] });
      await answer("BT20-016", { kind: "chooseTargets", instanceIds: [pail.permanentId] });
      // Same choice as production: accepting an attack on an already suspended host cannot declare another.
      await answer("BT20-016", { kind: "optional", accept: true });
      await settle(
        () => s.events.some((e) => e.kind === "attackEnded") && s.engine.mainVerbContinuationsInFlight === 0,
      );
      expect(pail.isSuspended).toBe(true);
      expect(s.state.players[1]!.security).toHaveLength(2);
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
      expect(s.state.memory).toBe(2);
      act({ type: "playCard", instanceId: hand("BT1-080").instanceId });
      await answer("EX3-008", { kind: "optional", accept: true });
      await settle(() => s.state.pendingDecision !== undefined);
      if (s.state.pendingDecision!.kind === "selectCards")
        await answer("EX3-008", { kind: "selectCards", instanceIds: [hand("EX3-063").instanceId] });
      await settle(() => s.state.pendingDecision?.kind === "optional");
      expect(JSON.parse(s.state.pendingDecision!.payloadJson).promptKey).toBe("activateBlitz");
      expect(s.engine.mainPhase.hasEnded).toBe(true);
      expect(s.state.turnSeat).toBe(0);
      expect(s.state.memory).toBe(-8);
      const dragon = field("EX3-063");
      expect(dragon.isSuspended).toBe(false);
      expect(dragon.stack.map((c) => c.cardId)).toEqual(
        expect.arrayContaining(["EX3-008", "P-110", "BT16-077", "BT20-016"]),
      );
      expect(s.state.players[1]!.battleArea).toHaveLength(1);
      await answer("EX3-063", { kind: "optional", accept: ending !== "decline" });
      if (ending !== "decline") {
        await settle(() => s.engine.hasAcceptedBlitzAttack(dragon.permanentId));
        expect(s.engine.mainPhase.hasEnded).toBe(true);
        expect(s.state.turnSeat).toBe(0);
        expect(s.state.pendingDecision).toBeUndefined();
        // Authoritative fields consumed by client canAttackWith/actionGuards outside Main.
        expect(dragon.canAttackPlayer).toBe(true);
        expect(
          s.state.players[0]!.battleArea.filter((p) => p.canAttackPlayer || p.attackablePermanentIds.length),
        ).toEqual([dragon]);
        expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(1);
        if (ending === "attack")
          act({ type: "attack", attackerPermanentId: dragon.permanentId, target: { kind: "player" } });
        else expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: false, reason: "wrong-phase" });
      }
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(s.engine.pendingBlitzAttack).toBeUndefined();
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.events.filter((e) => e.kind === "attackDeclared")).toHaveLength(ending === "attack" ? 2 : 1);
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(ending === "attack" ? 3 : 1);
      expect(s.state.players[1]!.security).toHaveLength(ending === "attack" ? 0 : 2);
      const events = s.events.map((e) => e.kind);
      expect(events.lastIndexOf("attackEnded")).toBeLessThan(events.lastIndexOf("turnEnded"));
      assertNoLoudGap(s);
    } finally {
      if (s.state.phase === Phase.Breeding) {
        act({ type: "endPhase" }, s.state.turnSeat);
        await advance(s.engine).waitForMainPhase(s.state.turnSeat);
      }
      s.engine.applyIntent(s.state.turnSeat, { type: "surrender" });
      await loop;
    }
  });
}
