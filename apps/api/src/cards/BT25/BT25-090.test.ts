import { describe, it, expect } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { internalsOf } from "../../engine/testkit/internals.js";
import "../index.js";

// A3 for BT25-090 (Tomoro Tenma, Tamer) — [All Turns] when any Digimon suspends, by suspending
// this Tamer, you MAY place the top 2 cards of your deck face down under this Tamer.
// source: documented behavior (OnTappedAnyone). (Debunks the doc's deck-source claim.)
//
// FAILS-WHEN-REVERTED: the Tamer gains 2 face-down digivolution cards and is suspended (cost). A
// no-op leaves the stack empty and the Tamer unsuspended.

async function settle(predicate: () => boolean, maxTicks = 300): Promise<void> {
  for (let i = 0; i < maxTicks && !predicate(); i++) {
    await Promise.resolve();
  }
}

describe("BT25-090 [All Turns] on any suspend, suspend → place top 2 deck under this Tamer", () => {
  it("places the top 2 deck cards face down under the Tamer and suspends it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-090", as: "tomoro" },
            // a Digimon to suspend (fires OnTappedAnyone)
            { card: "BT1-009", dp: 3000, as: "dummy" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0]!;
    const deckBefore = p0.deck.length;
    await s.engine.recomputeContinuousEffects();

    await internalsOf(s.engine).primitives.suspend([s.perm("dummy").permanentId]);
    await settle(() => s.perm("tomoro").stack.length >= 2);

    expect(s.perm("tomoro").stack.length).toBe(2);
    expect(s.perm("tomoro").isSuspended).toBe(true);
    expect(p0.deck.length).toBe(deckBefore - 2);
  });
});
