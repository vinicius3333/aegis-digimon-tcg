import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST16-14 (Matt Ishida):
//   "[All Turns] When one of your effects trashes a card in your hand, by suspending
//    this Tamer, gain 1 memory."
//
// FAILS-WHEN-REVERTED: the memory gain + Tamer suspension fires ONLY because ST16-14's
// whenHandTrashed watcher is active on the field. Without the card the watcher is absent
// and memory remains unchanged.

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST16-14 Matt Ishida — whenHandTrashed: by suspending this Tamer, gain 1 memory", () => {
  it("suspends the Tamer and gains 1 memory when owner's hand card is trashed", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "ST16-14", dp: 0, as: "tamer" }], hand: [{ card: "BT1-001", as: "handCard" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    const handCardId = s.inst("handCard").instanceId;

    await primitivesOf(s).trash([handCardId]);
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(1);
    expect(s.perm("tamer").isSuspended).toBe(true);
  });

  it("does NOT gain memory when the Tamer is already suspended (cost unpayable)", async () => {
    const s = setupEngine(
      {
        0: {
          // already suspended — cost cannot be paid
          battleArea: [{ card: "ST16-14", dp: 0, as: "tamer", suspended: true }],
          hand: [{ card: "BT1-001", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    const handCardId = s.inst("handCard").instanceId;

    await primitivesOf(s).trash([handCardId]);
    await settle(() => false, 100);

    expect(s.state.memory).toBe(0);
    // Tamer remains suspended (unchanged).
    expect(s.perm("tamer").isSuspended).toBe(true);
  });
});
