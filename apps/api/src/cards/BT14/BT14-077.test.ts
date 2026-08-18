import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
// Self-register every compiled-IR card module so BT14-077 (and the vanilla deck filler) resolve.
import "../index.js";

// A3 for BT14-077 (Machinedramon (Virus)) — the [Your Turn][Once Per Turn] rider:
//   "When a card in your opponent's deck is trashed, gain 1 memory."
// source: documented behavior (EffectTiming.OnDiscardLibrary gated on the milled
// deck's owner == card.Owner.Enemy). Phase 13 added the onDiscardLibrary SubTrigger event and the
// TrashTopDeck fire seam; this proves the watcher installs (recomputeContinuousEffects), fires on
// an OPPONENT-deck mill (gain memory), and stays silent on an OWN-deck mill (interpreter
// discardLibraryGate).
//
// FAILS-WHEN-REVERTED: (a) removing the BT14-077 SubTrigger consumer effect, or (b) dropping the
// `discardLibraryGate` from runSubTrigger (so the opponent gate never matches), turns the positive
// "memory +1" assertion RED. Reverting the gate ALSO makes the own-deck control gain memory => RED.

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT14-077 [Your Turn][Once Per Turn] opponent-deck-trash → gain 1 memory", () => {
  it("gains 1 memory when the OPPONENT's deck is milled (positive)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-077", dp: 11000 }] }, 1: { deck: ["BT1-009", "BT1-009", "BT1-009"] } },
      { autoAcceptOptional: true },
    );
    const p1 = s.state.players[1];
    // Install the [Your Turn] SubTrigger watcher (YourTurn -> EffectTiming.None at recompute).
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    const milled = (p1?.deck.splice(0, 1) ?? []).map((c) => c.instanceId);
    await primitivesOf(s).fireOnDiscardLibrary(1, milled);
    await settle(() => s.state.memory !== 0);

    expect(s.state.memory).toBe(1);
  });

  it("does NOT gain memory when the controller's OWN deck is milled (negative — opponent gate)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT14-077", dp: 11000 }], deck: ["BT1-009", "BT1-009", "BT1-009"] } },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0];
    await s.engine.recomputeContinuousEffects();

    s.state.memory = 0;
    const milled = (p0?.deck.splice(0, 1) ?? []).map((c) => c.instanceId);
    await primitivesOf(s).fireOnDiscardLibrary(0, milled);
    await settle(() => s.state.memory !== 0, 50);

    // The milled deck is the watcher controller's OWN: the discardLibraryGate rejects it.
    expect(s.state.memory).toBe(0);
  });
});
