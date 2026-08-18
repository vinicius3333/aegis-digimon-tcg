// Playing cards from hand, deck, trash, and token generation.

import type { ActionBase } from "./base.js";
import type { Filter, Target, ZoneRef } from "../filters.js";
import type { Cost, Scaling } from "../predicates.js";

export interface PlayWithoutCostAction extends ActionBase {
  kind: "PlayWithoutCost";
  /** What is played; `isSelf` for "play this card". */
  target: Target;
  /** From where, when stated ("from your hand or trash", "from security"). */
  from?: ZoneRef[];
  payCost: boolean;
  /**
   * Reduce the paid play cost by N when `payCost` is true ("you may play this card with the play
   * `card.Owner.UntilCalculateFixedCostEffect` for the duration of this one play). Folded INTO the
   * play verb (NOT a standalone CostModifier construct), floored at 0. Ignored when `payCost` is
   * false (a free play has nothing to reduce).
   */
  reduceCostBy?: number;
  /**
   * Source the played cards from the SOURCE permanent's OWN digivolution stack only — not every
   * battle-area permanent's stack (BT22-007 "play 3 [Mother Eater]s from ITS digivolution cards";
   * KB Q4858/Q4859/Q4860 "play 3 or as many as possible, up to 3"). `target.count` caps how many
   * (3 here) and is satisfied as-many-as-possible. The generic `from:["digivolutionCards"]` path
   * scans ALL permanents' stacks, so this scoped flag is required for a {Breeding} source whose
   * own stack is the pool. Mutually exclusive with `from`.
   */
  fromOwnDigivolutionStack?: boolean;
  /**
   * Play the resolved card(s) entering SUSPENDED (rested) rather than active — "play ... suspended"
   * (BT7-063's would-be-deleted SkullKnightmon/DeadlyAxemon enter suspended). Passed through to the
   * play verb, which rests the placed permanent. Default (absent/false) enters active.
   */
  suspended?: boolean;
  /**
   * Play the resolved card(s) to the controller's BREEDING area instead of the battle area
   * (EX5-040's effect-driven breeding play; Comprehensive Rules §4-17-1). Gated: only
   * Digimon/DigiEgg cards are breeding-playable (§6-4), and the breeding slot must be empty
   * (single-occupancy — an occupied slot is a no-op, not a throw).
   */
  breeding?: boolean;
  /** Cost reduction amount (alternative to reduceCostBy). */
  costReduction?: number;
  /** Suppress [On Play] effects of cards played by this action. */
  suppressOnPlayEffects?: boolean;
  /** Source filter for played cards (alternative to target). */
  source?: Filter;
  /** Cost modifier specification. */
  costModifier?: { amount: number; [key: string]: unknown };
  /**
   * Exclude candidates whose card name already appears among the controller's cards in the listed
   * zones — "play 1 [Deva] Digimon card ... without the same name as cards in the battle area or
   * trash" (EX5-001..012 Deva Security effects). A deduplication filter: any candidate whose
   * `nameEn` matches the name of an existing battle-area permanent (top card) and/or trash card for
   * the controller is dropped from the offerable/playable pool. Compared by `nameEn`.
   */
  notSameNameAs?: ("battleArea" | "trash")[];
  /**
   * Before resolving the play, verify the named zone is empty (contains no cards/permanents).
   * If the zone is non-empty, the action is skipped entirely — "play ... to your EMPTY breeding
   * area" (BT18-101 WhenDigivolving: play Lucemon: Larva to breeding area only when slot is free).
   * Supported zones: "breedingArea" (maps to the controller's breeding slot).
   */
  requiresEmpty?: "breedingArea";
  /**
   * The play is only offered while the SOURCE permanent has an active `＜Delay＞` keyword grant,
   * and the grant is consumed (removed) on resolution — "armed on one turn, fires on another"
   * semantics (P-243 [Start of Your Turn] play-from-trash). When set, `runAction` checks
   * `ctx.fx.grantedKeywords(permanentId)` for a `Delay` entry before proceeding; off-field
   * sources unconditionally skip. Pairs with `notEnteredThisTurn` (the standard `＜Delay＞`
   * option gate) and `GainKeyword(Delay)` as the arming write.
   */
  requiresDelayArmed?: true;
  /**
   * Dynamically adjusts the `dp.value` ceiling on the play target filter before
   * resolving candidates. `mode: "lowerCeiling"` reduces the ceiling, `"raiseCeiling"`
   * increases it, by `amount × scaledCount`. `scaledCount` comes from either:
   *   - `scalingSource`: a value stored in `EffectContext.namedCounts` (written by a
   *     prior Trash action's `trackCount`) — CAP-E13, BT20-077.
   *   - `scaling`: a live board count via the standard `Scaling` filter (e.g. "for each
   *     suspended Digimon") — EX11-032.
   * If the adjusted ceiling is ≤ 0 the candidate pool is empty and no card can be played.
   */
  dpCeilingModifier?: {
    mode: "lowerCeiling" | "raiseCeiling";
    amount: number;
    scalingSource?: string;
    scaling?: Scaling;
  };
  /**
   * Dynamically raises the `playCostLte` ceiling on the play target filter before resolving
   * candidates. `base` is the starting ceiling (overrides the filter's static `playCostLte`
   * when specified). For every `per` cards matching `filter` (across specified zones/controllers),
   * `raise` is added to the ceiling.
   * Final ceiling = `base + Math.floor(totalMatchingCards / per) * raise`.
   * When `filter.zone === "trash"` and `filter.controller === "both"`, both players' trashes are
   * counted. (CAP-E16, BT21-079)
   */
  playCostCeiling?: {
    base: number;
    raise: number;
    per: number;
    filter: Filter;
    unit: "cards" | "digivolutionCards";
    raw?: string;
  };
  /**
   * Bind the ids of the permanents actually played under this name in `EffectContext.boundPlayed`,
   * so a later action can reference "the Digimon this effect played" (mirrors `PlayFromZone`).
   * BT16-015: `Delete.target.filter.dp.valueFrom` compares an opponent's DP against the DP of the
   * Digimon this effect played.
   */
  bindResultAs?: string;
}

/**
 * Play any number of matching cards without paying the cost, capped by total printed play cost.
 * Used for effects like "play any number of [X] with play costs totaling N or less".
 */
export interface PlayMultipleAction extends ActionBase {
  kind: "PlayMultiple";
  totalCost: number;
  filter: Filter;
  from: ZoneRef | ZoneRef[] | "digivolution";
  payCost: boolean;
  /** Suppress [On Play] effects of cards played by this action. */
  suppressOnPlayEffects?: boolean;
}

/**
 * Play a card from a specified zone with an optional cost reduction (CAP-A10, BT19-099).
 * Resolves a matching card from `from` zone(s), reduces the play cost by `costReduction`
 * (floored at 0) when `payCost` is true, or plays for free when `payCost` is false.
 * When the filter carries `playCost.relativeToLeavingDigimon`, the target's printed play cost
 * must equal the triggering leaving Digimon's playCost plus that offset (resolved at runtime).
 */
export interface PlayFromZoneAction extends ActionBase {
  kind: "PlayFromZone";
  /** What to play; resolved across the `from` zones by the filter. */
  target: Target;
  /** Zone(s) to source candidates from (e.g. ["trash"], ["hand","trash"]). */
  from: ZoneRef[];
  /**
   * Cost reduction applied to the printed play cost (floored at 0). Ignored when `payCost` is false.
   * Defaults to 0 when absent (full cost).
   */
  costReduction?: number;
  /**
   * A DYNAMIC cost reduction scoped to THIS play, computed as `scaleFactor(scaling)` — "reduce this
   * effect's paid play cost by 1 for each of your face-up security cards" (EX11-034, Royal Base;
   * cf. BT19-096). Added to the static `costReduction` and floored at 0. Ignored when `payCost` is
   * false. Distinct from a board-wide CostModifier: it applies only to this accompanying play.
   */
  costReductionScaling?: Scaling;
  /**
   * True → player pays the reduced cost; false → free play.
   * Defaults to true (cost paid) when absent.
   */
  payCost?: boolean;
  /** True when the player may decline to play anything (0 selected is valid). */
  optional?: boolean;
  /** Suppress [On Play] effects of cards played by this action. */
  suppressOnPlayEffects?: boolean;
  /**
   * Store the permanent id(s) actually played under this name in `EffectContext.boundPlayed`,
   * so a downstream action can reference the exact card(s) this play resolved.
   */
  bindResultAs?: string;
}

/**
 * "By returning N levels' total worth of Digimon cards from <cost.target>, play 1 matching card
 * of each returned card's level from <playFilter> without paying the cost."
 *
 * Semantics (BT20-098 errata):
 * 1. Pay cost: select Digimon from `cost.target` whose levels sum to exactly `cost.target.totalLevels`.
 *    Return them to bottom of deck.
 * 2. For each returned card at level L, play 1 card matching `playFilter` AND level L from trash
 *    without paying its cost (`payCost: false`).
 * 3. Bind the set of played permanentIds under `bindResultAs` so downstream actions can reference
 *    them via `Filter.boundRef`.
 */
export interface PlayPerLevelAction extends ActionBase {
  kind: "PlayPerLevel";
  cost: Cost;
  /** Filter on which cards may be played (zone + kind + name/trait). */
  playFilter: Filter;
  /** When true, each played card's level must equal the corresponding returned card's level. */
  matchLevel: boolean;
  payCost: boolean;
  /** Store the set of played permanentIds under this name for downstream `filter.boundRef` use. */
  bindResultAs?: string;
  /** Suppress [On Play] effects of cards played by this action. */
  suppressOnPlayEffects?: boolean;
}

/** "Play N [X] Token(s) without paying the cost". */
export interface PlayTokenAction extends ActionBase {
  kind: "PlayToken";
  /** Token name tokens (from `[X]` refs). */
  tokens: string[];
  count: number;
  payCost: boolean;
  /** Single token name (alternative to tokens array). */
  token?: string;
  /** Single count (alternative to `count`). */
  amount?: number;
  /**
   * Which seat activates the play (attribution only; does NOT change where the token is placed).
   * Placement side is controlled by `placedAs`. Absent => the source's controller.
   */
  controller?: "mine" | "opponent";
  /**
   * Place the token as the OPPONENT's permanent even though the source's controller activates the
   * effect — "they play 1 [Petrification] Token" (EX11-012, KB Q5800). Absent => placed under the
   * source's controller.
   */
  placedAs?: "opponentDigimon";
  /** Play the token already suspended (e.g., "play 1 [Diaboromon] Token suspended"). */
  suspended?: boolean;
}
