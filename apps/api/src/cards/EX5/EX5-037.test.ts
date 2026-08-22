import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { getEffectModule } from "../../engine/effects/registry.js";
import "../index.js";

// A3 for EX5-037 (Vajramon) — Red Lv.5 Digimon.
//
// [On Play]: Draw 1. Then, you may play 1 [Deva] Digimon from your hand with a
// different name from all cards in your battle area and trash to an empty breeding
// slot without paying the cost.
//
// Observable outcome tested here:
//   - The [Deva] Digimon lands in the breeding slot (not hand, not battle area).
//   - Drawing occurs (deck shrinks by 1) before the Deva decision.
//
// FAILS-WHEN-REVERTED: drop the `playInstances(…, { payCost:false, breeding:true })`
// call → the Deva stays in hand OR lands in the battle area (not breeding).
//
// A Deva card used: BT10-079 (Sandiramon), Lv.5 Red Deva Digimon.

const VAJRAMON = "EX5-037";
const DEVA = "BT10-079"; // Sandiramon — confirmed [Deva] type
const FILLER = "BT1-009"; // Monodramon — non-Deva, for deck padding

describe("EX5-037 [On Play] draws 1 then plays Deva to breeding slot", () => {
  it("the [Deva] Digimon lands in the breeding slot, not hand or battle area", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: DEVA, as: "deva" },
          ],
          deck: [FILLER, FILLER, FILLER],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 7; // exact play cost of EX5-037

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });

    await settle(() => p0.breeding?.topCard?.cardId === DEVA);

    // Deva is in the breeding slot.
    expect(p0.breeding?.topCard?.cardId).toBe(DEVA);
    // Deva is no longer in hand.
    expect(p0.hand.some((c) => c.instanceId === s.inst("deva").instanceId)).toBe(false);
    // Deva is NOT in the battle area (not a normal play).
    expect(p0.battleArea.some((perm) => perm.topCard?.cardId === DEVA)).toBe(false);
    // Draw occurred: deck shrank by 1.
    expect(p0.deck.length).toBe(2);
  });

  it("does not play a Deva to breeding if the breeding slot is already occupied", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: VAJRAMON, as: "vajramon" },
            { card: DEVA, as: "deva" },
          ],
          deck: [FILLER, FILLER, FILLER],
          breeding: { card: FILLER, dp: 2000 },
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const p0 = s.state.players[0] as PlayerState;
    s.state.memory = 7;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("vajramon").instanceId })).toEqual({
      ok: true,
    });

    // Wait for draw to complete.
    await settle(() => p0.deck.length < 3);

    // The breeding slot is unchanged (still FILLER, not DEVA).
    expect(p0.breeding?.topCard?.cardId).toBe(FILLER);
    // The Deva stays in hand (was not chosen as there's no valid slot).
    expect(p0.hand.some((c) => c.instanceId === s.inst("deva").instanceId)).toBe(true);
  });

  it("registers the once-per-turn Option trigger and inherited Piercing effect", () => {
    const source = {
      instanceId: "source",
      cardId: VAJRAMON,
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const effects = getEffectModule(VAJRAMON)!.effectsForTiming(EffectTiming.None, source);
    expect(effects).toHaveLength(2);
    expect(effects[0]?.description).toContain("use an Option card");
    expect(effects[1]).toMatchObject({ isInherited: true, description: expect.stringContaining("Piercing") });
  });
});
