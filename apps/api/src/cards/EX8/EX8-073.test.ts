import { describe, it, expect } from "vitest";
// Importing the cards barrel self-registers every compiled-IR / hand-written module
// (boot side-effect) so the engine can look up EX8-073's static effects.
import "../index.js";
import { setupEngine } from "../../engine/testkit/harness.js";

/**
 * A3 for EX8-073 (Gallantmon (X Antibody)) — its `[All Turns]` static grant:
 * "If you have 0 or less memory, this Digimon isn't affected by the effects of your
 * opponent's Digimon."
 *
 * Q1e (regression contract): the committed corpus for this card's `memoryAtMost` condition
 * omitted `controller`, so the interpreter fell through to its unqualified branch
 * (`ctx.game.state.memory <= value`) — the memory gauge read RAW, from the current
 * turn player's perspective, never adjusted for who "you" are. That is wrong for an
 * `[All Turns]` grant, which is re-evaluated on BOTH players' turns: on the
 * non-turn-player's turn the raw gauge is the wrong sign for their own "you have N
 * memory" reading. `parse-condition.mjs` already emits `controller: "mine"` for this
 * exact phrasing, and the interpreter's qualified branch does the sign flip correctly
 * (`memoryAtLeast`/`memoryAtMost` case, `apps/api/src/engine/effects/interpreter.ts`) —
 * only the committed corpus for this card (and 35 others sharing the same emitted
 * shape) was stale relative to the handler.
 *
 * FAILS-WHEN-REVERTED: drop `controller: "mine"` from this card's compiled
 * `memoryAtMost` condition (the pre-fix corpus shape) and the immunity grant no longer
 * activates on the OPPONENT's turn even though seat 0 (this Digimon's controller) does
 * have 0-or-less memory from their own perspective — the negative-immunity assertion
 * below flips.
 */
describe("EX8-073 [All Turns] opponent-effect immunity gates on the OWNER's memory, not the raw gauge", () => {
  function place() {
    return setupEngine({
      0: { battleArea: [{ card: "EX8-073", dp: 12000, as: "gallantmon" }] },
    });
  }

  it("grants immunity on the opponent's turn when the OWNER's own memory is 0 or less", async () => {
    const s = place();
    const gallantmon = s.perm("gallantmon");
    // Seat 1's turn; the raw gauge favors seat 1 by 5 — from seat 0's (the owner's)
    // own perspective that is -5, i.e. 0-or-less memory, so the grant should apply.
    s.state.turnSeat = 1;
    s.state.memory = 5;

    await s.engine.recomputeContinuousEffects();

    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, kind: string, sourceKind?: string): boolean };
      }
    ).continuous;
    expect(continuous.hasRestriction(gallantmon.permanentId, "beAffected", "Digimon")).toBe(true);
  });

  it("negative control: no immunity when the OWNER's own memory is above 0", async () => {
    const s = place();
    const gallantmon = s.perm("gallantmon");
    // Seat 1's turn, raw gauge favors seat 0 by 5 — from seat 0's own perspective
    // that is +5, so the "0 or less" condition does not hold.
    s.state.turnSeat = 1;
    s.state.memory = -5;

    await s.engine.recomputeContinuousEffects();

    const continuous = (
      s.engine as unknown as {
        continuous: { hasRestriction(id: string, kind: string, sourceKind?: string): boolean };
      }
    ).continuous;
    expect(continuous.hasRestriction(gallantmon.permanentId, "beAffected", "Digimon")).toBe(false);
  });
});
