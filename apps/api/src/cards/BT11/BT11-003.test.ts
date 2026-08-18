import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for BT11-003 (Tokomon) — inherited [Your Turn][Once Per Turn] trigger:
//   "When you play a Digimon with [Angel], [Archangel], or [Fallen Angel] in its
//    traits, <Draw 1>." (documented behavior: OnEnterFieldAnyone, isInherited=true)
//
// FAILS-WHEN-REVERTED: with BT11-003 in the digivolution stack, firing
// OnEnterFieldAnyone with an Angel-trait Digimon as the subject causes <Draw 1>.
// Without the hand-written override the generated fallback was inert and the draw never fired.
// Two proofs:
//   1. Positive — Angel Digimon subject → card drawn from deck to hand.
//   2. Negative — non-Angel Digimon subject → no draw.

// BT1-053 (Darcmon) has type "Angel" in cards.json. BT1-009 (Monodramon) does not.
const ANGEL_CARD = "BT1-053"; // trait: Angel
const NON_ANGEL_CARD = "BT1-009"; // trait: Mini Dragon
const HOST_CARD = "BT1-009"; // the Digimon hosting BT11-003 in its stack

/**
 * Expose the internal fireTiming method (tests drive it directly to isolate the
 * OnEnterFieldAnyone window — same pattern as EX6-061.test.ts).
 */
function fireTiming(s: EngineSetup, timing: EffectTiming, trigger: Record<string, unknown> = {}): Promise<void> {
  return (
    s.engine as unknown as {
      fireTiming(t: EffectTiming, trigger?: Record<string, unknown>): Promise<void>;
    }
  ).fireTiming(timing, trigger);
}

describe("BT11-003 [Your Turn][OPT] when you play an Angel-trait Digimon, <Draw 1>", () => {
  it("draws 1 card when an Angel-trait Digimon enters the controller's battle area", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HOST_CARD, dp: 4000, as: "host", under: [{ card: "BT11-003" }] },
            { card: ANGEL_CARD, dp: 3000, as: "angelPerm" },
          ],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    const handBefore = p0.hand.length;

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId: s.perm("angelPerm").permanentId,
    });
    await settle(() => p0.hand.length > handBefore);

    // <Draw 1>: one card moved from the deck to the hand.
    expect(p0.hand.length).toBe(handBefore + 1);
    expect(p0.deck.length).toBe(0);
  });

  it("does NOT draw when the played Digimon has no Angel trait (negative control)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HOST_CARD, dp: 4000, as: "host", under: [{ card: "BT11-003" }] },
            { card: NON_ANGEL_CARD, dp: 3000, as: "nonAngel" },
          ],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true },
    );
    const p0 = s.state.players[0] as PlayerState;

    const handBefore = p0.hand.length;

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId: s.perm("nonAngel").permanentId,
    });
    // Allow time for any spurious resolve.
    await settle(() => false, 20);

    expect(p0.hand.length).toBe(handBefore); // no draw
    expect(p0.deck.length).toBe(1); // deck untouched
  });

  it("does NOT draw when it is the opponent's turn (Your Turn guard)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: HOST_CARD, dp: 4000, as: "host", under: [{ card: "BT11-003" }] },
            { card: ANGEL_CARD, dp: 3000, as: "angelPerm" },
          ],
          deck: [{ card: "BT1-001", faceUp: false }],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.turnSeat = 1; // opponent's turn — [Your Turn] gate fails for seat 0
    const p0 = s.state.players[0] as PlayerState;

    const handBefore = p0.hand.length;

    await fireTiming(s, EffectTiming.OnEnterFieldAnyone, {
      subjectPermanentId: s.perm("angelPerm").permanentId,
    });
    await settle(() => false, 20);

    expect(p0.hand.length).toBe(handBefore); // no draw off-turn
  });
});
