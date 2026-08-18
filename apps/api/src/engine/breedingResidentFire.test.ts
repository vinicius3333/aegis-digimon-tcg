import { describe, it, expect } from "vitest";
import { setupEngine } from "./testkit/harness.js";
// Self-register every compiled-IR card module so BT22-079's real IR is looked up.
import "../cards/index.js";
import { advance } from "./testkit/advance.js";

/**
 * A3 for the breeding-resident firing seam: a `[Breeding]` resident effect on a card in the
 * raising/breeding area fires at its seam (it CONTRIBUTES during the continuous recompute
 * while the card sits in breeding), not only when the card is on the battle area.
 *
 * source the breeding-resident effects gate on the effect runtime.IsExistOnBreedingArea(card)
 * (documented behavior — a [Breeding][Opponent's Turn] ESS firing while in breeding). The
 * engine's resident builders defaulted their base guard to `onField` (isOnBattleArea), which
 * is FALSE for a breeding-area card, so a [Breeding]-trigger effect never fired while in
 * breeding. The fix routes a `Breeding`-trigger effect through a breeding-aware builder whose
 * base guard is `isOnBreedingArea`.
 *
 * Vehicle — BT22-079: its `[Breeding]` resident effect installs a `wouldBePlayed` reduceCost
 * replacement (-1) for [Eater] Digimon, observable on the SubTrigger registry. With the card in
 * the BREEDING area, the continuous recompute must install that replacement.
 *
 * FAILS-WHEN-REVERTED: route the `Breeding` trigger back through the `onField`-guarded
 * staticModifier builder => the breeding-area card's [Breeding] effect does not fire =>
 * costReductionFor("wouldBePlayed", …) stays 0 and the assertion goes RED.
 */

const BREEDING_RESIDENT = "BT22-079"; // [Breeding] inherited reduceCost replacement

describe("breeding-resident firing seam — a [Breeding] effect fires while the card is in breeding", () => {
  it("a [Breeding] resident effect contributes its replacement while the card is in the breeding area", async () => {
    // A breeding-area permanent (a hatched egg digivolved into BT12-007 top) carrying BT22-079
    // as an INHERITED digivolution-stack card — its [Breeding] effect fires while in breeding.
    // BT22-079's [Breeding] effect is inherited (isInherited: true), so it must sit in the
    // digivolution stack (not the top) to pass the inherited-effect placement guard.
    const s = setupEngine({
      0: { breeding: { card: "BT1-009", as: "bred", under: [BREEDING_RESIDENT] } },
    });
    const bred = s.perm("bred");

    // Drive the REAL continuous recompute (the seam every [Breeding]/static resident fires at).
    await s.engine.recomputeContinuousEffects();

    // FAILS-WHEN-REVERTED: with the breeding builder guarded by onField, a breeding-area card's
    // [Breeding] effect never fires, so the replacement is never installed and this is 0.
    const reduction = advance(s.engine).ledgers.subTriggers.costReductionFor(
      "wouldBePlayed",
      bred.permanentId,
    );
    expect(reduction).toBe(1);
  });

  it("control — the same card with NO breeding permanent installs nothing (delta 0)", async () => {
    const s = setupEngine();
    // No BT22-079 in play at all.
    await s.engine.recomputeContinuousEffects();
    expect(advance(s.engine).ledgers.subTriggers.costReductionFor("wouldBePlayed", "nope")).toBe(0);
  });
});
