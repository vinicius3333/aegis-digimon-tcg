import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";
import { observe } from "./testkit/observe.js";

describe("Koto Grademon protected-block arena controls", () => {
  it.each([true, false])(
    "prior effect battle=%s distinguishes pending Piercing from security payment",
    async (earlierBattle) => {
      const preferred: string[] = [];
      const declines = ["You may place", "De-Digivolve", "Prevent leaving", ...(earlierBattle ? [] : ["Battle"])];
      const s = setupEngine(
        { 0: {}, 1: {} },
        {
          autoAcceptOptional: true,
          autoSelectCards: true,
          autoChooseOption: true,
          preferInstanceIds: preferred,
          declinePrompts: declines,
        },
      );
      layDevScenario(
        earlierBattle ? "arena-koto-grademon-pending-piercing" : "arena-koto-grademon-no-prior-battle",
        s.state,
        [BLUE_DECK, RED_DECK],
      );
      const attacker = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT25-049")!;
      const alphamon = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "EX13-060")!;
      const earlier = s.state.players[1]!.battleArea.find((p) => p.topCard.cardId === "BT20-053");
      preferred.push(
        attacker.topCard.instanceId,
        attacker.permanentId,
        "player",
        ...(earlier ? [earlier.permanentId] : []),
      );
      const security = s.state.players[1]!.security.map((c) => c.instanceId);
      const loop = s.engine.startTurnLoop();
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(observe(s.engine).hasKeyword(alphamon, "Blocker")).toBe(true);
      expect(
        s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-koto-final-judgment", useAs: "option" }),
      ).toEqual({ ok: true });
      await settle(() => observe(s.engine).blockingSeat() === 1);
      expect(attacker.topCard.cardId).toBe("BT25-057");
      expect(attacker.currentDP).toBe(16000);
      expect(observe(s.engine).hasPierce(attacker)).toBe(true);
      expect(s.events.filter((e) => e.kind === "battleCompared" && e.effectBattle !== undefined)).toHaveLength(
        earlierBattle ? 1 : 0,
      );
      expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual(security);
      declines.splice(declines.indexOf("Prevent leaving"), 1);
      expect(s.engine.applyIntent(1, { type: "declareBlock", blockerPermanentId: alphamon.permanentId })).toEqual({
        ok: true,
      });
      await settle(() => s.events.some((e) => e.kind === "attackEnded") && !observe(s.engine).isAttacking());
      expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === alphamon.permanentId)).toBe(true);
      expect(s.events.filter((e) => e.kind === "securityChecked")).toHaveLength(earlierBattle ? 2 : 0);
      expect(s.state.players[1]!.security.map((c) => c.instanceId)).toEqual(security.slice(earlierBattle ? 3 : 1));
      expect(s.state.players[1]!.trash.some((c) => c.instanceId === security[0])).toBe(true);
      expect(s.state.pendingDecision).toBeUndefined();
      expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
      await loop;
      assertNoLoudGap(s);
    },
  );
});
