// "For each/every N of ..." multipliers.

import type { Filter } from "../filters/filter.js";

/** Repeat or scale an amount "for each/every N of <filter>". */
export interface Scaling {
  /** "for every 2 ..." => 2; "for each ..." => 1. */
  per: number;
  /** Add this per computed unit instead of multiplying the action's base amount. */
  bonus?: number;
  /** Add this to a Delete action's maximum level per computed unit. */
  levelCeilingAdd?: number;
  /** The counted pool. Not needed for `digivolutionCards` or `usePaidCount`. */
  filter?: Filter;
  unit:
    | "cards" // battle-area permanents matching `filter`
    | "colors" // distinct colors among the matching cards
    /** Matching permanents, collapsing same-named ones to one (BT21-082). */
    | "distinctNames"
    | "security" // cards in `filter.controller`'s security stack
    | "trash"
    | "digivolutionCards" // the source's whole stack, regardless of face state
    | "selfFaceDownDigivolutionCards" // face-down stack cards only (EX9-061)
    | "digivolutionCardColors" // distinct colors in the source's stack, not cards (BT18-018)
    | "selfAndDigivolutionCardColors"
    /** Stack size of ONE matching permanent — the largest when several match (BT19-100). */
    | "digivolutionCardsOfFiltered"
    | "linkCards" // linked cards across matching permanents, not the permanents (BT25-075)
    | "deletedThisEffect"
    | "namedCount" // a count already in `EffectContext.namedCounts`
    | "targetColors"; // distinct colors on the selected target permanent
  /** Name to read when `unit` is `"namedCount"`, usually written by a prior `trackCount`. */
  countSource?: string;
  /**
   * Use the preceding cost's `out.paidCount` as the raw multiplier instead of evaluating
   * `filter` against the board (BT17-041). `filter`/`unit` are then ignored.
   */
  usePaidCount?: boolean;
  /**
   * Minimum for the computed count — BT7-040's memory cost equals your security count, but is 1
   * when you have none. Omitted means a count of 0 stays 0.
   */
  floor?: number;
  /**
   * For `DeleteLevelBudget`: add this to the base budget per `per` units counted (BT17-051), so
   * the scaling drives a budget add rather than an amount multiplier.
   */
  budgetAdd?: number;
}
