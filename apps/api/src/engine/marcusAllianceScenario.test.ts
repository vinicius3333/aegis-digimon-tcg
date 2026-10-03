import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("arena-marcus-alliance dev scenario", () => {
  for (const accept of [true, false]) {
    it(`${accept ? "accepts transformed" : "excludes untransformed"} Marcus through the real turn loop`, async () => {
      const s = setupEngine(
        { 0: {}, 1: {} },
        { autoSelectCards: true, ...(accept ? { autoAcceptOptional: true } : { autoDeclineOptional: true }) },
      );
      layDevScenario("arena-marcus-alliance", s.state, [BLUE_DECK, RED_DECK]);
      const human = s.state.players[0]!;
      const attacker = human.battleArea.find(({ topCard }) => topCard.cardId === "BT23-020")!;
      const marcus = human.battleArea.find(({ topCard }) => topCard.cardId === "BT12-092")!;
      const agumon = human.battleArea.find(({ topCard }) => topCard.cardId === "BT12-034")!;
      expect(marcus.currentDP).toBe(0);
      const loop = s.engine.startTurnLoop();
      try {
        await settle(() => s.state.phase === Phase.Breeding);
        expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
        await advance(s.engine).waitForMainPhase(0);
        expect(s.state.pendingDecision).toBeUndefined();
        expect(marcus.currentDP).toBe(accept ? 3000 : 0);
        expect(s.state.memory).toBe(accept ? 4 : 5);
        expect(
          s.engine.applyIntent(0, {
            type: "attack",
            attackerPermanentId: attacker.permanentId,
            target: { kind: "player" },
          }),
        ).toEqual({ ok: true });
        await settle(() => s.events.some((event) => event.kind === "alliancePrompt"));
        const prompt = s.events.find((event) => event.kind === "alliancePrompt")!;
        expect(prompt.eligibleAllyIds).toEqual(
          accept ? [marcus.permanentId, agumon.permanentId] : [agumon.permanentId],
        );
        expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: marcus.permanentId })).toEqual(
          accept ? { ok: true } : { ok: false, reason: "illegal-target" },
        );
        if (!accept) s.engine.applyIntent(0, { type: "respondAlliance" });
        await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);
        expect(marcus.isSuspended).toBe(accept);
        expect(agumon.isSuspended).toBe(false);
        expect(s.state.players[1]!.security).toHaveLength(accept ? 3 : 4);
        const checks = s.events.filter((event) => event.kind === "securityChecked");
        expect(checks.map((event) => event.battle?.attackerDP)).toEqual(accept ? [8000, 8000] : [5000]);
        expect(attacker.currentDP).toBe(5000);
        expect(attacker.securityAttack).toBe(1);
        assertNoLoudGap(s);
      } finally {
        if (s.engine.combat.hasOpenAllianceDecision) s.engine.applyIntent(0, { type: "respondAlliance" });
        s.engine.applyIntent(0, { type: "surrender" });
        await loop;
      }
    });
  }
});
