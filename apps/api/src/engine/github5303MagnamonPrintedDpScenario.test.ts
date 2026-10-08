import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { layDevScenario } from "./devScenario.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";
import { advance } from "./testkit/advance.js";
import { assertNoLoudGap, setupEngine, settle } from "./testkit/harness.js";

describe("GitHub #5303 Magnamon printed DP arena", () => {
  it("keeps the public play's exact DP changes until the real opponent turn ends", async () => {
    const s = setupEngine({ 0: {}, 1: {} }, { autoSelectCards: true, autoAcceptOptional: true });
    layDevScenario("arena-github5303-magnamon-printed-dp", s.state, [BLUE_DECK, RED_DECK]);
    const target = s.state.players[1]!.battleArea[0]!;
    const control = s.state.players[1]!.battleArea[1]!;
    const loop = s.engine.startTurnLoop();
    try {
      await settle(() => s.state.phase === Phase.Breeding);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: "dev-github5303-magnamon" })).toEqual({
        ok: true,
      });
      await settle(() => target.currentDP === 9000 && s.state.pendingDecision === undefined);
      const host = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "EX13-020")!;
      expect(host.currentDP).toBe(10000);
      expect(control.currentDP).toBe(6000);
      expect(s.state.memory).toBe(3);
      expect(host.stack).toHaveLength(0);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 1 && s.state.phase === Phase.Breeding);
      expect(host.currentDP).toBe(10000);
      expect(target.currentDP).toBe(9000);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(1);
      expect(host.currentDP).toBe(10000);
      expect(target.currentDP).toBe(9000);
      expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
      await settle(() => s.state.turnSeat === 0 && s.state.phase === Phase.Breeding);
      expect(host.currentDP).toBe(7000);
      expect(target.currentDP).toBe(17000);
      expect(control.currentDP).toBe(6000);
      expect(s.state.pendingDecision).toBeUndefined();
      assertNoLoudGap(s);
      expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
      await advance(s.engine).waitForMainPhase(0);
    } finally {
      s.engine.applyIntent(0, { type: "surrender" });
      await loop;
    }
  });
});
