import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { advance } from "./testkit/advance.js";
import { observe } from "./testkit/observe.js";
import { setupEngine, settle } from "./testkit/harness.js";

describe("next unsuspend phase card restrictions", () => {
  it.each(["BT11-055", "BT13-059", "BT14-047", "BT16-044", "BT16-046", "BT2-049", "BT24-045", "EX5-041"])(
    "Discord 1556333425395372163 sweep: %s blocks one phase and allows Ulforce's Tamer effect",
    async (cardId) => {
      const s = setupEngine(
        {
          0: {
            hand: [{ card: cardId, as: "source" }, "BT1-009"],
            battleArea: [{ card: "BT1-089", as: "greenTamer" }],
            deck: ["BT1-009", "BT1-009"],
            security: ["BT1-009", "BT1-009", "BT1-009"],
          },
          1: {
            battleArea: [{ card: "BT11-032", as: "ulforce", dp: 5000 }],
            hand: [{ card: "BT1-086", as: "blueTamer" }],
            deck: ["BT1-009", "BT1-009"],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferOptionIndex: 1 },
      );
      s.state.memory = 20;
      s.state.turnCount = 2;
      s.state.isFirstPlayersFirstTurn = false;
      await s.ready();
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
        ok: true,
      });
      await settle();
      expect(s.perm("ulforce").isSuspended).toBe(true);
      expect(observe(s.engine).isRestricted(s.perm("ulforce"), "unsuspend")).toBe(false);

      s.state.turnSeat = 1;
      s.state.memory = 10;
      const turn = s.engine.runOneTurn();
      try {
        await advance(s.engine).waitForMainPhase(1);
        expect(s.perm("ulforce").isSuspended).toBe(true);
        expect(observe(s.engine).isRestricted(s.perm("ulforce"), "unsuspendDuringOwnUnsuspendPhase")).toBe(false);
        expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("blueTamer").instanceId })).toEqual({
          ok: true,
        });
        await settle();
        expect(s.perm("ulforce").isSuspended).toBe(false);
        expect(s.state.pendingDecision).toBeUndefined();
      } finally {
        advance(s.engine).endMainPhaseIfOpen(1);
        await turn;
      }
    },
  );
});
