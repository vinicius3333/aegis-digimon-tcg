import { describe, it, expect } from "vitest";
import { PlayerState, EffectTiming } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../index.js";

// A3 for EX6-061 (Leviamon) — [All Turns][OPT] when an opponent's Digimon is played, by trashing 1
// hand card, RETURN the bottom 3 digivolution cards of 1 opponent Digimon to the BOTTOM of the deck
// (not trash). source: documented behavior (rule implementation).
//
// FAILS-WHEN-REVERTED: the target's bottom 3 digivolution cards move to the deck (its stack shrinks
// by 3, the deck grows by 3) and a hand card is trashed. A no-op leaves the stack intact.

describe("EX6-061 [All Turns] opp Digimon played → return bottom 3 digivolution cards to deck", () => {
  it("returns the chosen opponent Digimon's bottom 3 digivolution cards to the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX6-061", dp: 12000, as: "leviamon" }],
          hand: [{ card: "BT1-009", faceUp: false }], // a hand card to trash (the cost)
        },
        1: {
          // Target opp Digimon A with 3 digivolution cards (first candidate). A second opp Digimon B
          // keeps oppTotal(2) > ownerTotal(1) so the conditional delete gate does NOT fire.
          battleArea: [
            {
              card: "BT1-009",
              dp: 4000,
              as: "targetA",
              under: [
                { card: "BT1-009", faceUp: false },
                { card: "BT1-009", faceUp: false },
                { card: "BT1-009", faceUp: false },
              ],
            },
            { card: "BT1-010", dp: 4000 },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p1 = s.state.players[1] as PlayerState;
    const targetA = s.perm("targetA");
    const deckBefore = p1.deck.length;

    await s.engine.recomputeContinuousEffects();
    await (s.engine as unknown as {
      fireTiming: (t: EffectTiming, trigger?: Record<string, unknown>) => Promise<void>;
    }).fireTiming(EffectTiming.OnEnterFieldAnyone, { subjectPermanentId: targetA.permanentId });
    await settle(() => p1.deck.length >= deckBefore + 3);

    // The bottom 3 digivolution cards left targetA's stack and went to the deck.
    expect(targetA.stack.length).toBe(0);
    expect(p1.deck.length).toBe(deckBefore + 3);
    // targetA itself stays on the field (it was the return target, not deleted).
    expect(p1.battleArea.some((perm) => perm.permanentId === targetA.permanentId)).toBe(true);
  });
});
