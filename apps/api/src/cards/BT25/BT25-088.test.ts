import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT25-088 (Kyo Sawashiro, Tamer) — [All Turns] when your security is removed, by
// suspending this Tamer, you MAY place the top 2 cards of your deck face down under this Tamer.
// source: documented behavior. (Debunks the doc's "PlaceUnder from deck BLOCKED".)
//
// FAILS-WHEN-REVERTED: the Tamer gains 2 face-down digivolution cards (from the deck top) and is
// suspended (the cost). A no-op leaves the stack empty and the Tamer unsuspended.

describe("BT25-088 [All Turns] on security removal, suspend → place top 2 deck under this Tamer", () => {
  it("places the top 2 deck cards face down under the Tamer and suspends it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-088", dp: 0, as: "kyo" }],
          deck: ["BT1-009", "BT1-010", "BT1-011"],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    const deckBefore = p0.deck.length;
    await s.engine.recomputeContinuousEffects();

    // Drive the real OnLoseSecurity window (the same seam the security-loss path fires).
    await (s.engine as unknown as {
      fireTiming: (t: EffectTiming, trigger?: Record<string, unknown>) => Promise<void>;
    }).fireTiming(EffectTiming.OnLoseSecurity, { removedFromSecuritySeat: 0 });
    await settle(() => s.perm("kyo").stack.length >= 2);

    // 2 face-down cards from the deck top are now under the Tamer; the Tamer is suspended (cost).
    expect(s.perm("kyo").stack.length).toBe(2);
    expect(s.perm("kyo").isSuspended).toBe(true);
    expect(p0.deck.length).toBe(deckBefore - 2);
  });
});
