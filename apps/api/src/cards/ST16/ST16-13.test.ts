import { describe, it, expect } from "vitest";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for ST16-13 (SkullMammothmon):
//   "[All Turns][Once Per Turn] When one of your effects trashes a card in your hand,
//    you may play 1 level 4 or lower purple Digimon card from your trash without the cost."
//
// FAILS-WHEN-REVERTED: the free play from trash fires ONLY because ST16-13 is on the field
// installing a whenHandTrashed watcher. Without the card the watcher is absent and the
// trash-to-play path never runs — battle area count stays at its initial value.
//
// Card IDs used:
//   ST16-13  — SkullMammothmon (the card under test)
//   BT10-074 — Lv.4 Purple Digimon (legal target for the effect)
//   BT1-001  — any card to trash from hand (triggers whenHandTrashed)

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("ST16-13 SkullMammothmon — whenHandTrashed plays Lv.4-or-lower purple Digimon from trash", () => {
  it("plays a level 4 purple Digimon from trash when owner hand is trashed (watcher active)", async () => {
    // ST16-13 on the battle area → whenHandTrashed watcher is installed.
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST16-13", dp: 12000, as: "skull" }],
          // BT10-074 is a real Lv.4 Purple Digimon (verified from cards.json).
          trash: [{ card: "BT10-074", as: "trashTarget" }],
          // A hand card that will be trashed to fire the whenHandTrashed event.
          hand: [{ card: "BT1-001", as: "handCard" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0]!;
    await s.engine.recomputeContinuousEffects();

    const trashTargetId = s.inst("trashTarget").instanceId;
    const handCardId = s.inst("handCard").instanceId;
    const initialCount = p0.battleArea.length;

    // primitives.trash fires whenHandTrashed when the trashed card was in hand.
    await primitivesOf(s).trash([handCardId], { byEffectSeat: 0 });
    await settle(() => p0.battleArea.length > initialCount);

    // BT10-074 should have been played from trash onto the battle area.
    expect(p0.battleArea.length).toBeGreaterThan(initialCount);
    expect(p0.trash.some((c) => c.instanceId === trashTargetId)).toBe(false);
  });

  it("does NOT play from trash when ST16-13 is absent (watcher not installed)", async () => {
    // ST16-13 is NOT on the battle area — no watcher.
    const s = setupEngine({
      0: {
        trash: [{ card: "BT10-074", as: "trashTarget" }],
        hand: [{ card: "BT1-001", as: "handCard" }],
      },
    });
    const p0 = s.state.players[0]!;
    const trashTargetId = s.inst("trashTarget").instanceId;
    const handCardId = s.inst("handCard").instanceId;
    const initialCount = p0.battleArea.length;

    await primitivesOf(s).trash([handCardId]);
    await settle(() => false, 100);

    expect(p0.battleArea.length).toBe(initialCount);
    expect(p0.trash.some((c) => c.instanceId === trashTargetId)).toBe(true);
  });
});
