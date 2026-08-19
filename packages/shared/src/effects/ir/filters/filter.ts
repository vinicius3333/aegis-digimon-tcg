// The composed `Filter` and the selection shape `Target`.

import type { Condition } from "../predicates/conditions.js";
import type { Scaling } from "../predicates/scaling.js";
import type { BoardPredicates } from "./boardPredicates.js";
import type { CardPredicates } from "./cardPredicates.js";
import type { CompilerAliases } from "./compilerAliases.js";
import type { ContextPredicates } from "./contextPredicates.js";
import type { Controller, ZoneRef } from "./zones.js";

/**
 * Which cards/permanents a target picks out. Every field is optional and they AND together, so an
 * empty Filter matches any card in scope.
 *
 * The fields are grouped by what answering them requires: the card definition
 * ({@link CardPredicates}), the live board ({@link BoardPredicates}), the resolution context
 * ({@link ContextPredicates}), or nothing at all because the compiler emitted a shorthand the
 * interpreter normalizes ({@link CompilerAliases}).
 */
export interface Filter extends CardPredicates, BoardPredicates, ContextPredicates, CompilerAliases {}

/** A resolved target specification for an action. */
export interface Target {
  filter: Filter;
  /** Default 1. `"all"` for "all ...". */
  count: number | "all";
  /** Who makes a non-trivial choice. Defaults to the effect's controller. */
  chooser?: "controller" | "opponent";
  /** Added to numeric `count` when the condition/scaling applies. */
  countModifier?: {
    amount: number;
    condition?: Condition;
    scaling?: Scaling;
  };
  /**
   * Hand-zone Trash targets only: trash `max(0, handSize - untilHandSize)` player-chosen cards.
   * Overrides `count` (CAP-E12, BT20-077).
   */
  untilHandSize?: number;
  /** "up to N" rather than exactly N. */
  upTo?: boolean;
  /** "this Digimon", "this card". */
  isSelf?: boolean;
  /**
   * On a `Trash` target: trash each permanent's TOP CARD and promote the card beneath, rather
   * than treating the permanent as a loose card.
   *
   * "Trash the top card of 1 of your Digimon" (BT8-110) and "trash 1 of your Digimon" reach the
   * interpreter as the same shape but mean different things. The prose compiler cannot yet tell
   * them apart, so this is set by hand on the affected card's module.
   */
  topCardOnly?: boolean;
  /**
   * Resolve to the permanent that triggered the enclosing SubTrigger (the engine's recorded
   * `subjectPermanentId`) instead of running a candidate search.
   */
  sourceRef?: "triggerSubject" | "triggerDefender";
  /**
   * Bind the resolved permanent(s) so a later `Filter.relativeTo` or `PlaceUnder.underSelectionRef`
   * can reference them. The interpreter records the first resolved permanentId for the effect's
   * duration.
   */
  bindAs?: string;
  /**
   * Reuse a permanent bound earlier under `bindAs` instead of selecting again ("place [the
   * chosen Digimon A] under another Digimon"). `filter`/`count` are ignored; an unbound ref
   * resolves to nothing.
   */
  fromSelectionRef?: string;
  /** Shorthand for `filter.controller`. */
  controller?: Controller;
  /** Source zone for play/place targets. */
  source?: ZoneRef | ZoneRef[];
  /** For budget-based targeting. */
  totalDpCap?: number;
  /**
   * Printed levels must sum to EXACTLY this value, or at most it when `upTo`. BT20-098's errata
   * makes "9 levels' total worth of Digimon cards" exact, not up to 9.
   */
  totalLevels?: number;
  /** Shorthand for `filter.zone`. */
  location?: string | string[];
  from?: string | string[];
  /**
   * Carve survivors out of a `count: "all"` action ("delete all of your opponent's Digimon
   * except 1"). `filter` scopes the survivor pool, which may differ from the action's own filter
   * — EX11-046 deletes the opponent's Digimon but spares their HIGHEST-play-cost one. `selector`
   * narrows within that pool before the choice; ties still require one.
   */
  except?: {
    filter: Filter;
    count: number;
    /** Omitted means any matching permanent. */
    selector?: "any" | "highestPlayCost";
    chooser?: "controller" | "opponent";
  };
  isSelfRef?: boolean;
  zone?: ZoneRef | ZoneRef[];
  /**
   * Within-target UNION: a candidate qualifies if it matches `filter` OR any of these
   * ("play 1 [X] or 1 [Y]", BT17-074). The player still chooses `count` from the combined set.
   */
  orFilters?: Filter[];
  /** Loose-card costs: at most one card per printed name. */
  distinctNames?: boolean;
  /** Loose-card costs: at most one copy of each card number. */
  distinctCardNumbers?: boolean;
  /** Loose-card costs: at most one card per printed level. */
  distinctLevels?: boolean;
  /** Loose-card costs: one card for each listed printed name. */
  requiredNamesExact?: string[];
  /** As `requiredNamesExact`, but takes the maximum available rather than requiring all. */
  requiredNamesExactUpTo?: string[];
  /**
   * Reuse the preceding action's chosen permanent(s) instead of prompting again ("1 of your
   * Digimon gains X … that Digimon also gains Y"). `filter`/`count` are ignored in favor of
   * `lastResolvedPermanentIds` (CAP-A9, BT19-089).
   */
  sameTarget?: boolean;
  /**
   * On a `Digivolve` action: resolve the base from BREEDING rather than the battle area
   * (BT20-018). The permanent moves to the battle area first. KB Q4300 — this does NOT trigger
   * [When Digivolving]; it is a placement, not a normal digivolve.
   */
  targetBreeding?: true;
}
