import { createBreedingVerbs } from "../breeding.js";

import type { PrimitivesContext } from "./context.js";

/**
 * The breeding-area verbs, built by breeding.ts and surfaced here so the whole
 * verb set comes from one place.
 */

export function createBreedingAreaVerbs(pc: PrimitivesContext) {
  const { engine } = pc;

  const { hatch, placeUnderFromEggDeck, placeAsTopFromEggDeck } = createBreedingVerbs(engine);

  /**
   * Single-sourced three-ledger teardown for every seam where a permanent leaves the
   * battle area (delete, DNA-material consumption, relocate-under, battle->breeding,
   * and bounce-to-hand/deck/security via collectForReturn).
   * Drops the modifier, continuous, and subTrigger entries anchored to `permanentId`
   * together so a dead/relocated/inert source's duration modifiers, continuous statics,
   * and replacement/watcher subscriptions cannot survive to apply, recompute, or fire.
   * Mirrors GameEngine.dropPermanentSubscriptions (the combat/security seam) — hand-
   * rolling the drop list per site is exactly how the subTrigger drop drifted out of the
   * relocate/toBreeding seams.
   */

  return { hatch, placeUnderFromEggDeck, placeAsTopFromEggDeck };
}
