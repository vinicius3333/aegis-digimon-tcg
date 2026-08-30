import { describe, it, expect } from "vitest";
import { setupEngine, settle } from "./testkit/harness.js";
// Self-register every compiled-IR card module so BT22-079's real IR is looked up.
import "../cards/index.js";

/**
 * A3 for the breeding-resident firing seam: a `[Breeding]` resident effect on a card in the
 * raising/breeding area fires at its pay-time seam while the card sits in breeding, not only
 * when the card is on the battle area.
 *
 * source the breeding-resident effects gate on the effect runtime.IsExistOnBreedingArea(card)
 * (documented behavior — a [Breeding][Opponent's Turn] ESS firing while in breeding). The
 * engine's resident builders defaulted their base guard to `onField` (isOnBattleArea), which
 * is FALSE for a breeding-area card, so a [Breeding]-trigger effect never fired while in
 * breeding. The fix routes a `Breeding`-trigger effect through a breeding-aware builder whose
 * base guard is `isOnBreedingArea`.
 *
 * Vehicle — BT22-079: its `[Breeding]` resident effect applies a `wouldBePlayed` reduceCost
 * replacement (-1) for [Eater] Digimon. With the card in the BREEDING area, a natural play must
 * pay exactly 1 less than the same play without that resident source.
 *
 * FAILS-WHEN-REVERTED: route the `Breeding` trigger back through the `onField`-guarded
 * staticModifier builder => the breeding-area card's [Breeding] effect does not fire and the
 * natural play pays the full printed cost, making the exact memory assertion go RED.
 */

const BREEDING_RESIDENT = "BT22-079"; // [Breeding] inherited reduceCost replacement

describe("breeding-resident firing seam — a [Breeding] effect fires while the card is in breeding", () => {
  it("a [Breeding] resident effect contributes its replacement while the card is in the breeding area", async () => {
    // A breeding-area permanent (a hatched egg digivolved into BT12-007 top) carrying BT22-079
    // as an INHERITED digivolution-stack card — its [Breeding] effect fires while in breeding.
    // BT22-079's [Breeding] effect is inherited (isInherited: true), so it must sit in the
    // digivolution stack (not the top) to pass the inherited-effect placement guard.
    const s = setupEngine(
      {
        0: {
          breeding: { card: "BT1-009", under: [BREEDING_RESIDENT] },
          hand: [{ card: "BT22-079", as: "eater" }],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eater").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-079"));

    // Printed cost 3, reduced by exactly 1 from the breeding resident.
    expect(s.state.memory).toBe(1);
  });

  it("control — the same play with no breeding resident pays the full printed cost", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT22-079", as: "eater" }], deck: ["BT1-001"] } });
    s.state.memory = 3;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("eater").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT22-079"));

    expect(s.state.memory).toBe(0);
  });
});
