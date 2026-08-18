// Gates and quantities: activation conditions, costs, and scaling factors.

import type { Filter, Target } from "./filters.js";

/**
 * A gating condition ("If ...", "While ..."). The parsed predicate stays loose: recognized
 * structured forms plus a `raw` fallback. An unrecognized condition means "cannot evaluate"
 * and does not fire, rather than guessing.
 */
export interface Condition {
  kind:
    | "true" // for Aura records whose target filter already carries the condition
    | "youHave"
    | "opponentHas"
    | "youHaveNone"
    | "opponentHasNone"
    | "memoryAtLeast"
    | "memoryAtMost"
    | "securityAtLeast"
    | "securityAtMost"
    | "handAtMost"
    | "handAtLeast"
    | "isYourTurn"
    | "isOpponentsTurn"
    | "phaseIs"
    | "duringAttack" // the current trigger payload carries an attacker
    | "attackTargetsPlayer"
    | "attackTargetMatchesFilter" // honors superlatives such as highest DP
    | "lastTargetDpAtLeast" // every permanent the preceding action selected still has >= `value` DP
    | "selfDigivolutionStackHasTrait" // `filter.nameOrTrait` vs each stack card's Form ∪ Attribute ∪ Type (BT7-024)
    | "selfDigivolutionStackHasColor" // BT8-082
    | "selfDigivolutionStackHasNonColor" // BT10-001
    | "selfDigivolutionStackDistinctColorCount"
    | "selfTopHasText" // `filter.nameOrTrait` vs the SOURCE top card's name/trait/effect text (EX11-070)
    | "selfDigivolutionCountAtLeast" // source stack size >= `value` (BT22-007; KB Q4858)
    | "selfDigivolutionStackCountAtLeast" // stack cards matching `filter.nameOrTrait` >= `count` (BT11-065)
    | "selfIsSuspended" // EX3-042, EX8-043
    | "selfUnsuspended" // P-199 only offers its by-suspending reduction while it can still be suspended
    | "selfDpAtLeast"
    | "allOf"
    | "anyOf"
    | "not"
    // Effect-result bindings written during THIS resolution; see EffectContext.lastDeleteCount /
    // lastDigivolveResult / lastOptionUsed.
    | "ifThisEffectDidNotDelete" // an immune or prevented target counts as not deleted (KB BT23-069 Q5338)
    | "ifThisEffectDidNotSuspend"
    | "ifThisEffectUsed" // an Option-use happened this resolution (KB EX8-037 Q4737)
    | "ifThisEffectDigivolved" // KB BT19-084 Q3146-Q3150
    | "ifThisEffectActed" // the prior branch moved >=1 card; a declined optional selection leaves it false (BT16-094)
    | "ifThisEffectDidNotAct" // complement of ifThisEffectActed (EX4-070; KB Q3514)
    | "ifOpponentDeclined"
    // SubTrigger fire-time payload gates; only meaningful inside a watcher body.
    | "triggerSecurityIsYours"
    | "triggerAddedSecurityHasTrait" // whenAddSecurity: a just-added card matches `filter`
    | "triggerByYourEffect" // whenDigivolutionTrashed: byEffectSeat === ownerSeat (KB P-004 "when YOU trash")
    | "triggerEnteredByEffect" // entered play BY an effect, not a manual play/digivolve (BT25-084). A When Attacking entry never sets it.
    | "triggerPlayedByEffectSource" // the exact card named by `sourceCardId` drove the play
    | "triggerOptionCostAtLeast" // the Option's ORIGINAL use cost, not a reduced one (BT19-040; KB Q5471-Q5473)
    | "triggerSubjectHasColor" // evaluated POST-digivolve (BT25-026; KB Q6290/Q6291)
    | "triggerSubjectMatchesFilter" // non-color subject gates; later "then" branches still run (BT21-061)
    | "triggerDigivolvedSameLevel" // BT9-092
    | "triggerDeletedLevelAtLeast"
    | "triggerAttackerIsSelf"
    | "triggerAttackerMatchesFilter"
    | "triggerDefenderIsSelf"
    | "triggerDefenderMatchesFilter" // the originally declared defender, before Blocker redirection
    | "triggerRemovedSecuritySeat"
    | "triggerRemovalCause"
    | "noTamerInDigivolution"
    | "selfHasNoDigivolutionCards" // played directly, not digivolved into (BT19-101). Off-field source => false.
    | "notEnteredThisTurn" // the ＜Delay＞ option gate: enterFieldTurnCount differs from turnCount
    | "isDnaDigivolving" // only inside a WhenDigivolving reached via DNA digivolve (BT20-045, P-221, EX9-021)
    | "digivolvedFromZone" // BT17-065
    | "playedFromZone" // BT7-018
    | "zoneCount" // `seat`'s `zone` size vs `value` via `op`; the superset of the memory/security/hand gates
    | "zoneColorCount" // distinct colors among battle-area permanents of `cardType` (ST20-10/ST21-10; KB Q4456)
    | "securityCompare" // your security count vs the opponent's; `op` is "lt" (P-127) or "gt" (P-129)
    | "securityAtMostSelfFaceDownDigivolutionCards" // EX9-029, KB Q4783
    | "totalSecurityCount" // both stacks summed
    | "totalDigimonCount" // both players' battle-area Digimon (BT9-110)
    | "totalDigimonGte" // legacy alias with an implicit gte (ST19-11)
    | "permanentCount" // `seat`'s permanents matching `filter`; with `filter.distinctNames`, distinct names only (BT21-010)
    | "selfHasMinTrash" // honors a `filter` on the counted trash cards, unlike `zoneCount` (BT2-111)
    | "selfHasTrait" // the LIVE top card's trait union, unlike selfDigivolutionStackHasTrait (EX12-004)
    | "selfHasKeyword" // live server-authoritative keyword state, including mechanics such as Piercing
    | "selfHasOnPlayEffect"
    | "youDigivolvedThisTurn"
    | "opponentDidNotAttackWithDigimonThisTurn"
    | "selfHasName" // exact match against the live top-card name
    | "selfColorCount"
    | "selfLevelIs"
    | "selfLevelAtLeast"
    | "stackHasSameLevelCards" // among top + digivolution cards, at least N share a level
    | "digiXrosCount" // the triggering DigiXros used >= `minimum` materials; false if it was not a DigiXros
    | "selfHasInDigivolutionCards" // BT19-073. Off-field source => false.
    | "bindingEmpty" // a never-written binding counts as empty (BT18-101)
    | "bindingExists"
    | "bindingContains"
    | "boardCountCompare"
    | "triggerSourceNotDeletedAtSameTiming" // the attacker survived the exchange it won (CAP-E11, BT20-044)
    | "selfHasNameContaining" // BT20-080. Off-field source => false.
    | "orConditions" // alias for "anyOf", emitted when the runtime record spells the combinator out (BT21-010)
    | "namedCountAtLeast" // the `trackCount` tally under `countSource` >= `count`; unset => 0 (BT7-015)
    | "raw";
  filter?: Filter;
  count?: number;
  /**
   * For `opponentHas` / `youHave`: minimum permanent count, default 1. Kept separate from
   * `count` so "if your opponent has 2 or more Digimon" does not overload it (BT19-026).
   */
  countMin?: number;
  value?: number;
  phase?: "Active" | "Draw" | "Breeding" | "Main" | "End" | "None";
  /**
   * For memoryAtLeast/memoryAtMost: which side of the gauge is compared. Omitted keeps the
   * legacy turn-relative comparison.
   */
  controller?: "mine" | "self" | "opponent";
  // For `zoneCount`: which player's zone, which zone, and the comparison.
  seat?: "mine" | "opponent";
  zone?: "hand" | "trash" | "security" | "deck";
  op?: "gte" | "lte" | "lt" | "gt" | "eq";
  /** For `boardCountCompare`: left operand, default opponent. */
  left?: "mine" | "opponent";
  /** For `boardCountCompare`: right operand, default mine. */
  right?: "mine" | "opponent";
  /** For `zoneColorCount`. */
  cardType?: "Digimon" | "Tamer" | "Option";
  /** For `zoneColorCount`: the only supported aggregation. */
  unit?: "distinctColors";
  /** For `digiXrosCount`. */
  minimum?: number;
  /** For `triggerPlayedByEffectSource`. */
  sourceCardId?: string;
  /**
   * For `allOf`/`anyOf`. A true AND of independent checks — P-116 requires three distinct named
   * Digimon in play, which a single multi-name filter would express as an OR.
   */
  conditions?: Condition[];
  /** For `not`. */
  condition?: Condition;
  /** For `selfHasInDigivolutionCards`. */
  nameOrTrait?: { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" }[];
  /** For the `binding*` kinds: the binding written by a preceding `bindResultAs`. */
  ref?: string;
  /** For `namedCountAtLeast`: the name a preceding `trackCount` wrote. */
  countSource?: string;
  /** For `selfHasNameContaining`: OR-matched substrings (BT20-080). */
  names?: string[];
  /** For `selfHasNameContaining`: names that disqualify an otherwise matching host. */
  excludeNames?: string[];
  /** For `selfHasKeyword`. */
  keyword?: string;
  /** For `triggerRemovalCause`. */
  removalCause?: "byEffect" | "byBattle" | "byRule";
  raw?: string;
  matchPredicate?: string;
}

/**
 * A cost paid as part of an action ("by trashing 1 card", "by suspending this Tamer"). Modeled
 * as a nested action performed first; if it cannot be paid, the parent action does not happen.
 */
export interface Cost {
  kind:
    | "trash"
    | "suspend"
    | "unsuspend" // BT14-054
    | "return"
    | "place"
    | "deleteOwn"
    | "payMemory"
    | "flipSecurity" // flip your top face-up security card face down (BT23-043, EX11-031)
    | "trashSecurityTop" // ST23-05
    | "securityToHand"
    | "placeAsSecurity" // move a permanent to the security stack (BT19-048)
    | "playFromDigivolutionCards" // play a card from a selected Digimon's stack (BT19-102)
    | "raw";
  target?: Target;
  /** Host permanent selected before resolving a stack-card play cost (BT19-102). */
  hostTarget?: Target;
  /** For `payMemory`. */
  memory?: number;
  /**
   * The controller may decline to pay and the effect still resolves unpaid. Distinct from a
   * "You may" on the whole action.
   */
  optional?: boolean;
  raw?: string;
  /** For `return` costs; `"deckBottom"` sends the card under its owner's deck (BT19-002). */
  to?: "hand" | "deckBottom";
  /**
   * Store the returned Digimon's level in `EffectContext.namedCounts` under this name, so a
   * later `levelLte` can compare against it (BT19-002 "returnedDigimonLevel").
   */
  storeAs?: string;
  /**
   * Store how many cards the cost actually moved, for a later scaling or `countSource`
   * ("by placing up to N cards ... reduce by X for each card placed").
   */
  trackCount?: string;
  /** Destination for place costs: "under one of your Tamers" → {controller:"mine",kind:["Tamer"]}. */
  underFilter?: Filter;
  /**
   * Host filters unioned with `underFilter` ("level 3 OR the [Legend-Arms] trait" — EX6-007,
   * EX6-009). Mirrors `Target.orFilters` and threads through `host:"target"` the same way.
   */
  underOrFilters?: Filter[];
  /**
   * Routing for a place cost whose destination is not the default digivolution stack:
   * `"security"` (BT23-045, BT24-040, BT25-044) or `"digivolutionStack"` at `position`
   * (EX9-055 top; EX9-064 bottom, face down). Absent keeps the legacy placeUnder behavior.
   */
  destination?: "security" | "digivolutionStack";
  /**
   * Which end to place at. `"choice"` prompts per placed card (EX12-077). `"faceUpBottom"` is
   * `placeAsSecurity` only: face-up under the security stack (BT19-048).
   */
  position?: "top" | "bottom" | "choice" | "faceUpBottom";
  /**
   * `"self"` places under the source; `"target"` under the `underFilter` host (legacy string
   * form); the object form lets the player pick a matching host (BT21-071).
   */
  host?: "self" | "target" | { filter: Filter; count: number };
  /** Only meaningful for `destination:"security"`; digivolution cards are always face-down. */
  faceDown?: boolean;
  /** The place cost relocates a battle-area permanent rather than a loose card. */
  targetIsPermanent?: boolean;
  /** Store the chosen host permanent id for a downstream `target.fromSelectionRef`. */
  bindHostAs?: string;
  /**
   * For a `destination:"security"` place cost: store the placed instance ids in
   * `EffectContext.boundPlayed`, mirroring `Action.bindResultAs` for a cost-side move.
   */
  bindResultAs?: string;
}

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
    | "namedCount"; // a count already in `EffectContext.namedCounts`
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
