import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
// Self-register every compiled-IR card module so BT14-083 (and the vanilla filler) resolve.
import "../index.js";

// A3 for BT14-083 (Joe Kido) — the [Your Turn][Once Per Turn] rider:
//   "When a digivolution card of an opponent's Digimon is trashed, by suspending this Tamer,
//    gain 1 memory."
// source: documented behavior (EffectTiming.OnDigivolutionCardDiscarded + suspend cost).
// Phase 13 added the onDigivolutionCardDiscarded SubTrigger event and the trashDigivolutionCards
// fire seam; this proves the watcher installs (recomputeContinuousEffects), fires only on an
// OPPONENT's Digimon losing a digivolution card (sourceFilter controller:"opponent"), pays the
// suspend-this-Tamer cost, and gains 1 memory.
//
// FAILS-WHEN-REVERTED: removing the BT14-083 SubTrigger consumer effect turns the positive
// "memory +1 / Tamer suspended" assertion RED; the sourceFilter is proven by the own-Digimon
// negative (no gain).

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT14-083 [Your Turn][Once Per Turn] opponent digivolution-card trash → suspend Tamer, gain 1 memory", () => {
  it("gains 1 memory and suspends the Tamer when an OPPONENT Digimon loses a digivolution card (positive)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT14-083", dp: 0, as: "tamer" }] },
        1: {
          battleArea: [
            { card: "BT1-009", dp: 3000, as: "oppDigimon", under: [{ card: "BT1-009", as: "digiCard", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    await primitivesOf(s).trashDigivolutionCards(s.perm("oppDigimon").permanentId, [s.inst("digiCard").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").isSuspended).toBe(true); // the suspend-this-Tamer cost was paid
  });

  it("does NOT gain memory when the controller's OWN Digimon loses a digivolution card (negative — sourceFilter)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT14-083", dp: 0, as: "tamer" },
            { card: "BT1-009", dp: 3000, as: "ownDigimon", under: [{ card: "BT1-009", as: "digiCard", faceUp: false }] },
          ],
        },
      },
      { autoAcceptOptional: true },
    );
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    await primitivesOf(s).trashDigivolutionCards(s.perm("ownDigimon").permanentId, [s.inst("digiCard").instanceId], {
      byEffectSeat: 0,
    });
    await settle(() => s.state.memory !== 0, 50);

    // The lost digivolution card belongs to the controller's OWN Digimon: the
    // controller:"opponent" sourceFilter rejects it — no gain, Tamer stays unsuspended.
    expect(s.state.memory).toBe(0);
    expect(s.perm("tamer").isSuspended).toBe(false);
  });
});
