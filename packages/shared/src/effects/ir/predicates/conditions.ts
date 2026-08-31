// Activation gates: the "If ..." / "While ..." predicates in front of a clause.

import type { Filter } from "../filters/filter.js";

/**
 * A gating condition ("If ...", "While ..."). The parsed predicate stays loose: recognized
 * structured forms plus a `raw` fallback. An unrecognized condition means "cannot evaluate"
 * and does not fire, rather than guessing.
 */
export interface Condition {
  kind:
    | "true" // for Aura records whose target filter already carries the condition
    | "youHave"
    | "anyHas" // a matching permanent may belong to either player unless the filter names a controller
    | "youHaveGreenLevelAtLeastInBattle"
    | "breedingActionAvailable"
    | "opponentHas"
    | "youHaveNone"
    | "opponentHasNone"
    | "memoryAtLeast"
    | "memoryAtMost"
    | "securityAtLeast"
    | "securityAtMost"
    | "faceUpSecurityAtMost"
    | "handAtMost"
    | "handAtLeast"
    | "isYourTurn"
    | "isOpponentsTurn"
    | "phaseIs"
    | "duringAttack" // the current trigger payload carries an attacker
    | "attackTargetsPlayer"
    | "attackTargetMatchesFilter" // honors superlatives such as highest DP
    | "lastTargetDpAtLeast" // every permanent the preceding action selected still has >= `value` DP
    | "lastTargetDpAtMostSelf" // every permanent the preceding action selected has DP <= this Digimon
    | "lastTargetDpGreaterThanSelf" // every permanent the preceding action selected has DP > this Digimon
    | "lastTargetCanTrashDigivolution" // the previous target still has stack cards and is not level 3 (EX5-055)
    | "lastTargetPlayCostAtMost" // the preceding target's current printed play cost (BT3-107)
    | "triggerRevealedFromDeck" // the source card is among the cards this effect revealed from a deck
    | "triggerRevealedMatchesFilter" // any card in the current reveal window matches `filter`
    | "triggerAllRevealedMatchFilter"
    | "lastTrashedMatchesFilter" // a card moved by the preceding Trash action matches `filter`
    | "triggerAttackBy" // the current attack was declared through the named attack mechanic
    | "allYoursMatchFilter" // every permanent you control in the battle area matches `filter`
    | "breedingAreaEmpty"
    | "digivolutionCountCompare" // a selected Digimon's stack size vs the source/target stack
    | "digivolutionCardCount" // matching cards in the SOURCE Digimon's stack (EX11-046)
    | "triggerPlayCostAtMostStackCount" // the triggered card's play cost <= a matching stack count
    | "selfDigivolutionStackHasTrait" // `filter.nameOrTrait` vs each stack card's Form ∪ Attribute ∪ Type (BT7-024)
    | "selfLacksInDigivolutionCards" // true when no SOURCE stack card matches `filter` (P-144)
    | "selfDigivolutionStackDistinctNameCount" // distinct names in the SOURCE stack (EX6-006)
    | "selfDigivolutionStackMatchesFilter" // any SOURCE stack card matches the full filter (BT17-101)
    | "selfDigivolutionStackHasColor" // BT8-082
    | "selfDigivolutionStackHasNonColor" // BT10-001
    | "selfDigivolutionStackDistinctColorCount"
    | "selfTopHasText" // `filter.nameOrTrait` vs the SOURCE top card's name/trait/effect text (EX11-070)
    | "selfDigivolutionCountAtLeast" // source stack size >= `value` (BT22-007; KB Q4858)
    | "selfLinkCountAtLeast" // source linked-card count >= `value` (BT26-086)
    | "selfDigivolutionCountExactly" // source stack size equals `value`
    | "selfDigivolutionStackCountAtLeast" // stack cards matching `filter.nameOrTrait` >= `count` (BT11-065)
    | "selfDigivolutionStackHasSameLevelPair" // 2 or more SOURCE stack cards share a level (BT23-102)
    | "selfIsSuspended" // EX3-042, EX8-043
    | "selfUnsuspended" // P-199 only offers its by-suspending reduction while it can still be suspended
    | "selfDpAtLeast"
    | "allOf"
    | "anyOf"
    | "not"
    // Effect-result bindings written during THIS resolution; see EffectContext.lastDeleteCount /
    // lastDigivolveResult / lastOptionUsed.
    | "ifThisEffectDidNotDelete" // an immune or prevented target counts as not deleted (KB BT23-069 Q5338)
    | "ifThisEffectDidNotDeleteChosenTarget" // a chosen protected target satisfies an otherwise branch
    | "ifThisEffectDidNotSuspend"
    | "ifThisEffectUsed" // an Option-use happened this resolution (KB EX8-037 Q4737)
    | "ifThisEffectDigivolved" // KB BT19-084 Q3146-Q3150
    | "ifThisEffectActed" // the prior branch moved >=1 card; a declined optional selection leaves it false (BT16-094)
    | "ifThisEffectDidNotAct" // complement of ifThisEffectActed (EX4-070; KB Q3514)
    | "ifOpponentDeclined"
    | "opponentDeclinedTrash" // legacy alias used by the prose compiler (BT3-102/BT13-102)
    // SubTrigger fire-time payload gates; only meaningful inside a watcher body.
    | "triggerSecurityIsYours"
    | "triggerSecurityIsOpponents"
    | "triggerAddedSecurityHasTrait" // whenAddSecurity: a just-added card matches `filter`
    | "triggerByYourEffect" // whenDigivolutionTrashed: byEffectSeat === ownerSeat (KB P-004 "when YOU trash")
    | "triggerByYourDigimonEffect" // whenEffectAddsToHand: your Digimon effect added cards to hand
    | "triggerEnteredByEffect" // entered play BY an effect, not a manual play/digivolve (BT25-084). A When Attacking entry never sets it.
    | "triggerPlayedOrDigivolvedByEffect" // either a whenPlayed effect event or an effect-driven digivolve (BT25-077)
    | "selfEnteredByEffect" // the live source permanent's current top entered by an effect (BT25-080)
    | "triggerPlayedByEffectSource" // the exact card named by `sourceCardId` drove the play
    | "triggerPlayedByDecode" // the play was caused by an explicit Decode replacement payload
    | "lastSuspendedIsMine" // the preceding Suspend action actually suspended one of your permanents
    | "triggerOptionCostAtLeast" // use cost after card-level changes, before payment-only reductions (BT10-032 Q1956/Q1957)
    | "triggerOptionMatchesFilter" // the used Option's printed definition matches `filter`
    | "triggerSubjectHasColor" // evaluated POST-digivolve (BT25-026; KB Q6290/Q6291)
    | "triggerSubjectMatchesFilter" // non-color subject gates; later "then" branches still run (BT21-061)
    | "triggerDigivolvedSameLevel" // BT9-092
    | "triggerSubjectStackHasSameLevel" // BT22-093: any source shares the current top's level
    | "triggerDeletedLevelAtLeast"
    | "triggerDeletedStackMatchesFilter"
    | "triggerAttackerIsSelf"
    | "triggerAttackerMatchesFilter"
    | "triggerDefenderIsSelf"
    | "triggerDefenderMatchesFilter" // the originally declared defender, before Blocker redirection
    | "triggerRemovedSecuritySeat"
    | "triggerSecurityRemovedByEffect"
    | "triggerHandTrashedSeat"
    | "triggeredByEffect" // whenSuspended was produced by an effect, not attack/block rules (EX11-062)
    | "triggerRemovalCause"
    | "triggerDeletedIsOpponent"
    | "triggerDeletedByDpZero"
    | "triggerIsFirstDeletedPermanent"
    | "noTamerInDigivolution"
    | "noFaceUpSecurity"
    | "selfHasNoDigivolutionCards" // played directly, not digivolved into (BT19-101). Off-field source => false.
    | "selfHadDigivolutionCards" // the stack the source held when it was deleted, still readable once it left the field
    | "notEnteredThisTurn" // the ＜Delay＞ option gate: enterFieldTurnCount differs from turnCount
    | "isDnaDigivolving" // only inside a WhenDigivolving reached via DNA digivolve (BT20-045, P-221, EX9-021)
    | "digivolvedFromZone" // BT17-065
    | "playedFromZone" // BT7-018
    | "zoneCount" // `seat`'s `zone` size vs `value` via `op`; the superset of the memory/security/hand gates
    | "combinedTrashCount" // both players' trash zones summed
    | "zoneColorCount" // distinct colors among battle-area permanents of `cardType` (ST20-10/ST21-10; KB Q4456)
    | "securityCompare" // your security count vs the opponent's; `op` is "lt" (P-127) or "gt" (P-129)
    | "handCompare" // your hand count vs the opponent's
    | "securityAtMostSelfFaceDownDigivolutionCards" // EX9-029, KB Q4783
    | "sourceWasFaceUpSecurity"
    | "totalSecurityCount" // both stacks summed
    | "totalDigimonCount" // both players' battle-area Digimon (BT9-110)
    | "totalDigimonGte" // legacy alias with an implicit gte (ST19-11)
    | "totalDigimonLevelsGte" // sum of printed levels on both players' battle-area Digimon (BT25-077)
    | "permanentCount" // `seat`'s permanents matching `filter`; with `filter.distinctNames`, distinct names only (BT21-010)
    | "selfHasMinTrash" // honors a `filter` on the counted trash cards, unlike `zoneCount` (BT2-111)
    | "selfHasTrait" // the LIVE top card's trait union, unlike selfDigivolutionStackHasTrait (EX12-004)
    | "selfIsInBattleArea" // the source permanent still exists on the field (EX8-009 Q3874)
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
    | "lastEffectDidNotAct"
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
  countMax?: number;
  value?: number;
  phase?: "Active" | "Draw" | "Breeding" | "Main" | "End" | "None";
  /**
   * For memoryAtLeast/memoryAtMost: which side of the gauge is compared. Omitted keeps the
   * legacy turn-relative comparison.
   */
  controller?: "mine" | "self" | "opponent";
  // For `zoneCount`: which player's zone, which zone, and the comparison.
  seat?: "mine" | "opponent" | "any";
  zone?: "hand" | "trash" | "security" | "deck" | "battleArea";
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
  /** For `allOf`/`anyOf`: a true AND of independent checks. */
  conditions?: Condition[];
  /** For `not`. */
  condition?: Condition;
  /** For `selfHasInDigivolutionCards`. */
  nameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "traitContains" | "text" | "any";
  }[];
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
  /** Optional named deletion procedure paired with `triggerRemovalCause`. */
  removalMechanic?: "Overclock";
  raw?: string;
  matchPredicate?: string;
}
