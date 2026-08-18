// Gates and quantities: activation conditions, costs, and scaling factors.

import type { Filter, Target } from "./filters.js";

/**
 * A gating condition ("If ...", "While ..."). v1 keeps the parsed predicate
 * loose: a small set of recognized structured forms plus a `raw` fallback the
 * interpreter can log. The interpreter treats an unrecognized condition as
 * "cannot evaluate" (does not fire) rather than guessing.
 */
export interface Condition {
  kind:
    | "true" // unconditional gate, mainly for Aura records whose target filter carries the full condition
    | "youHave" // you control/have something matching `filter` (optionally >= count)
    | "opponentHas"
    | "youHaveNone" // you have ZERO permanents matching `filter`
    | "opponentHasNone" // opponent has ZERO matching `filter` ("while your opponent has no unsuspended Digimon")
    | "memoryAtLeast"
    | "memoryAtMost"
    | "securityAtLeast"
    | "securityAtMost"
    | "handAtMost" // "if you have N or fewer cards in your hand" (your hand size <= value)
    | "handAtLeast" // "if you have N or more cards in your hand" (your hand size >= value)
    | "isYourTurn"
    | "isOpponentsTurn" // "if it's your opponent's turn"
    | "phaseIs" // true only while the game is in the named phase (for example Main)
    | "duringAttack" // "if during an attack" — true when the current trigger payload carries an attacker.
    | "attackTargetsPlayer" // true when the current attack was declared at a player rather than a permanent
    | "attackTargetMatchesFilter" // true when the attacked permanent matches `filter`, including superlatives such as highest DP
    | "lastTargetDpAtLeast" // true when every permanent selected by the preceding action currently has at least `value` DP
    | "selfDigivolutionStackHasTrait" // "while a card with [X] in its traits is in THIS Digimon's digivolution cards" (BT7-024); `filter.nameOrTrait` carries the trait token(s), matched against each stack card's trait union (Form ∪ Attribute ∪ Type)
    | "selfDigivolutionStackHasColor" // true when a SOURCE stack card has one of `filter.colors` (BT8-082)
    | "selfDigivolutionStackHasNonColor" // true when a SOURCE stack card has none of `filter.colors` (BT10-001)
    | "selfDigivolutionStackDistinctColorCount" // distinct printed colors among SOURCE stack cards matching `filter`, compared with `op`/`value`
    | "selfTopHasText" // "while THIS permanent's top card has [X] in its text" (EX11-070's inherited [All Turns] gate: host TopCard.HasText("Maquinamon")); `filter.nameOrTrait` carries the text token(s), matched against the SOURCE permanent's (the inherited host's) top-card name/trait/effect text
    | "selfDigivolutionCountAtLeast" // "if this Digimon has N or more digivolution cards" — reads the SOURCE permanent's digivolution-stack size >= `value` (BT22-007 "10 or more digivolution cards"; KB Q4858)
    | "selfDigivolutionStackCountAtLeast" // "if N or more cards matching [filter] are in THIS Digimon's digivolution cards" — counts SOURCE-permanent stack cards matching `filter.nameOrTrait` >= `count` (BT11-065 "4+ [Vemmon]")
    | "selfIsSuspended" // "while/if this Digimon is suspended" — true when the SOURCE permanent's isSuspended flag is set (EX3-042, EX8-043)
    | "selfUnsuspended" // "while this is unsuspended" — true when the SOURCE permanent is NOT suspended (P-199's by-suspending-this-Tamer reduction is only offered while it can still be suspended)
    | "selfDpAtLeast" // the SOURCE permanent's current DP is at least `value`
    | "allOf" // ALL of `conditions` must hold (logical AND of nested documented behavior checks)
    | "anyOf" // ANY of `conditions` must hold (logical OR — "[X] is in digivolution cards OR you have [Y]")
    | "not" // logical NOT of `condition` (used for "... otherwise ..." branches)
    // --- effect-result-binding gates (read the ctx outcome bindings set during THIS effect's
    // resolution; see EffectContext.lastDeleteCount / lastDigivolveResult / lastOptionUsed) ---
    | "ifThisEffectDidNotDelete" // "if this effect didn't delete ..." — true when the prior Delete removed 0 (an immune/prevented target counts as not deleted; KB BT23-069 Q5338)
    | "ifThisEffectDidNotSuspend" // "if this effect didn't suspend ..." — true when the prior Suspend action suspended 0 targets
    | "ifThisEffectUsed" // "if this effect used [the Option] ..." — true when an Option-use happened this resolution (bool set in 08-06; KB EX8-037 Q4737)
    | "ifThisEffectDigivolved" // "then (if it digivolved) ..." — true when the prior digivolve happened (KB BT19-084 Q3146-Q3150)
    | "ifThisEffectActed" // "if you did (either) ..." — true when the prior place/trash branch actually moved >=1 card (BT16-094 OR-modal: -7000 DP only if you placed or trashed; an optional selection declined to nothing leaves it false)
    | "ifThisEffectDidNotAct" // "if they do not ..." — complement of ifThisEffectActed: true when the prior action moved 0 cards (EX4-070: gain 2 memory if the opponent did not trash an Option; KB Q3514)
    | "ifOpponentDeclined" // true when the immediately preceding opponent choice was declined
    // --- SubTrigger fire-time payload gates (read the firing event's TriggerInfo; only
    // meaningful inside a SubTrigger watcher body) ---
    | "triggerSecurityIsYours"
    | "triggerAddedSecurityHasTrait" // whenAddSecurity: at least one card just added to security matches `filter` (the [Zaxon]/[Royal Base] face-up gate; documented behavior SecurityCondition)
    | "triggerByYourEffect" // whenDigivolutionTrashed: the trash that fired this event was driven by the watcher controller's OWN effect (TriggerInfo.byEffectSeat === ownerSeat; KB P-004 "when YOU trash")
    | "triggerEnteredByEffect" // OnPlay/WhenDigivolving: this card ENTERED the battle area by an effect (played/digivolved by an effect, not a manual hard play/digivolve) — TriggerInfo.enteredByEffect === ownerSeat. Gates the "after, if played or digivolved by an effect" clause (BT25-084 EnteredByEffect; a When Attacking entry never sets it, so the clause can't fire on attack).
    | "triggerPlayedByEffectSource" // OnPlay: the exact card named by `sourceCardId` produced this effect-driven play.
    | "triggerOptionCostAtLeast" // whenOptionUsed: the used Option's ORIGINAL use cost is >= `value` (BT19-040 "an Option card with a cost of 2 or more"; KB Q5471-Q5473: the gate reads the cost itself, not a paid/reduced cost — TriggerInfo.usedOptionCost)
    | "triggerSubjectHasColor" // whenPlayed/whenOneOfYoursDigivolves: the permanent that drove the event (TriggerInfo.subjectPermanentId) carries one of `filter.colors` on its top card — evaluated at fire-time POST-digivolve (BT25-026; KB Q6290 "triggers on any color but activates only when that Digimon is red", Q6291 "references the Digimon after it digivolves")
    | "triggerSubjectMatchesFilter" // whenPlayed/whenOneOfYoursDigivolves: the subject permanent that drove the event matches `filter` at fire-time; used for non-color gates such as [ADVENTURE] trait while later "then" branches still run (BT21-061).
    | "triggerDigivolvedSameLevel" // whenOneOfYoursDigivolves: the new top Digimon has the same printed level as the prior top card (BT9-092 Cool Boy).
    | "triggerDeletedLevelAtLeast" // battle-deletion payload: the deleted top Digimon was level >= `value`
    | "triggerAttackerIsSelf" // current battle/attack payload's attacker is the source card's host permanent
    | "triggerAttackerMatchesFilter" // current attack payload's attacker matches `filter`
    | "triggerDefenderIsSelf" // current attack payload's effective defender is the source card's host permanent
    | "triggerDefenderMatchesFilter" // the originally declared attacked permanent matches `filter` (before any Blocker redirection)
    | "triggerRemovedSecuritySeat" // whenSecurityRemoved: the seat whose security stack was removed from matches `seat`.
    | "triggerRemovalCause" // On Deletion: the removal cause matches `removalCause`.
    | "noTamerInDigivolution" // "if this Digimon has no Tamer cards in its digivolution cards"
    | "selfHasNoDigivolutionCards" // "if this Digimon has no digivolution cards" — true when the SOURCE permanent's stack is empty (played directly, not digivolved into; BT19-101). An off-field source => false.
    | "notEnteredThisTurn" // "you can't activate this effect the turn this card enters play" — true when the SOURCE permanent's enterFieldTurnCount differs from the current turnCount (documented behavior CanDeclareOptionDelayEffect: the ＜Delay＞ option gate)
    | "isDnaDigivolving" // "if you DNA digivolved" — true only inside a WhenDigivolving window reached via a DNA digivolve (two materials merged). Reads TriggerInfo.isDnaDigivolve, set by the DNA-digivolve fire seam. Used to gate a DNA-only branch (BT20-045, P-221, EX9-021).
    | "digivolvedFromZone" // WhenDigivolving: the card that caused this window came from `zone` (BT17-065 "this digivolved from the trash").
    | "playedFromZone" // OnPlay: the played card originated from `zone` (BT7-018).
    | "zoneCount" // "if you/your opponent have exactly/more/fewer than N cards in your/their hand|trash|security|deck" — compares `seat`'s `zone` size against `value` via `op` (gte|lte|gt|lt|eq). Generic resource-count gate (the seat×zone superset of memory/security/hand At-Least/Most).
    | "zoneColorCount" // "if your Tamers have N or more total colors" — counts distinct printed colors among battle-area permanents of `cardType` (ST20-10/ST21-10; KB Q4456).
    | "securityCompare" // "if you have fewer/more security cards than your opponent" — cross-player relative comparison of YOUR security-stack size vs the OPPONENT's (P-127 fewer → documented behavior Owner.SecurityCards.Count < Enemy; P-129 more → >). `op` is "lt" (fewer) or "gt" (more); no fixed `value`.
    | "securityAtMostSelfFaceDownDigivolutionCards" // "if you have as many or fewer security cards as this Digimon has face-down digivolution cards" — compares the watcher's security-stack size against the SOURCE permanent's face-down (faceUp !== true) stack-card count (EX9-029, KB Q4783).
    | "totalSecurityCount" // "there are N or fewer/more total cards in both players' security stacks" — sums both security stacks then compares with `op`/`value`.
    | "totalDigimonCount" // total battle-area Digimon controlled by both players, compared with `op`/`value` (BT9-110).
    | "totalDigimonGte" // legacy alias for totalDigimonCount with an implicit gte comparison (ST19-11).
    | "permanentCount" // "if you have N or more/fewer permanents matching [filter]" — counts `seat`'s battle-area permanents matching `filter` and compares to `value` via `op`. With `filter.distinctNames`, counts distinct names only ("3+ [Hero] Tamers with different names", BT21-010). The seat×kind×name superset of youHave/opponentHas.
    | "selfHasMinTrash" // "while you have N or more cards in your trash" — counts `seat`'s trash (default: your own) matching `filter` (default: any card) >= `count` (BT2-111 "10+ in trash"). Distinct from `zoneCount` (unfiltered) — this honors a card-definition `filter` on the counted trash cards.
    | "selfHasTrait" // "this Digimon with the [X] trait" — true when the SOURCE permanent's LIVE top card's trait union (Form ∪ Attribute ∪ Type) matches `filter.nameOrTrait`. Distinct from `selfDigivolutionStackHasTrait` (which searches stack cards below the top). An off-field source => false. (EX12-004)
    | "selfHasKeyword" // "this Digimon has <X>" — reads the SOURCE permanent's live, server-authoritative keyword state (including dedicated mechanics such as Piercing)
    | "selfHasOnPlayEffect" // "this Digimon has an [On Play] effect" — checks the live top card's printed main effect text
    | "youDigivolvedThisTurn" // true after this effect's controller has completed at least one digivolution in the current turn
    | "opponentDidNotAttackWithDigimonThisTurn"
    | "selfHasName" // "this Digimon is [X]" — exact match against the SOURCE permanent's live top-card name.
    | "selfColorCount" // "this Digimon has N or more colors" — counts distinct printed colors on the SOURCE permanent's live top card.
    | "selfLevelIs" // "this Digimon is level N" — exact match against the SOURCE permanent's live top-card level.
    | "selfLevelAtLeast" // "this Digimon is level N or higher" — lower-bound match against the SOURCE permanent's live top-card level.
    | "stackHasSameLevelCards" // "this Digimon's stack has N or more same-level cards" — among top + digivolution cards, at least N cards share a level.
    | "digiXrosCount" // "DigiXrosing with N cards" — true when the DigiXros that triggered the current OnPlay/WhenDigivolving used at least `minimum` material cards (TriggerInfo.digiXrosMaterialCount). False if the trigger was not a DigiXros.
    | "selfHasInDigivolutionCards" // "[X] is in this Digimon's digivolution cards" — true when the SOURCE permanent has at least one digivolution stack card whose name or trait matches `nameOrTrait`. Off-field source => false. (BT19-073 AllTurns gate)
    | "bindingEmpty" // "this effect didn't trash / do X" — true when the named binding in `ref` holds zero cards (i.e. the prior action trashed/moved nothing). If the binding was never written, treated as empty (conservative — the producing action must have run and populated it; BT18-101 EndOfAllTurns conditional delete).
    | "bindingExists" // "if this effect did/digivolved/played a card" — true when the named binding in `ref` has one or more cards/permanents written by a prior action in the same resolution.
    | "bindingContains" // "if this effect moved/returned a card matching [filter]" — true when the named binding contains at least one card whose definition matches `filter`.
    | "boardCountCompare" // cross-player comparison of battle-area permanents matching `filter` (e.g. opponent has as many or more total Digimon/Tamers as you).
    | "triggerSourceNotDeletedAtSameTiming" // whenDeletesInBattle fireCondition: true when the trigger source (the attacking Digimon) is still alive, i.e. was NOT deleted at the same timing as the opponent it deleted. Reads `TriggerInfo.attackerPermanentId` from the live board. (CAP-E11, BT20-044)
    | "selfHasNameContaining" // "this Digimon has [X] in its name" — true when the SOURCE permanent's current top-card name contains any of `names` as a substring. Off-field source => false. (BT20-080)
    | "orConditions" // logical OR over `conditions` — true when ANY sub-condition holds (BT21-010). Alias for "anyOf"; used when the runtime record emits the OR combinator explicitly.
    | "namedCountAtLeast" // "if N or more cards were <verb>ed by this effect" — true when the tally a prior action wrote via `trackCount` into `EffectContext.namedCounts` under `countSource` is >= `count` (BT7-015: 7+ cards returned). Unset counter => 0 => false.
    | "raw";
  filter?: Filter;
  count?: number;
  /**
   * For `opponentHas` / `youHave`: the battle-area permanent count must be at
   * least this many (default 1 when omitted). Encodes "if your opponent has 2 or
   * more Digimon" without overloading the existing `count` field (BT19-026).
   */
  countMin?: number;
  value?: number;
  /** For `phaseIs`: exact shared Phase enum value. */
  phase?: "Active" | "Draw" | "Breeding" | "Main" | "End" | "None";
  /**
   * For memoryAtLeast/memoryAtMost, whose side of the memory gauge is being compared.
   * Omitted preserves the legacy turn-relative comparison.
   */
  controller?: "mine" | "self" | "opponent";
  // For `zoneCount`: which player's zone to size, the zone, and the comparison.
  seat?: "mine" | "opponent";
  zone?: "hand" | "trash" | "security" | "deck";
  op?: "gte" | "lte" | "lt" | "gt" | "eq";
  /** For `boardCountCompare`: which side is the left operand. Defaults to opponent. */
  left?: "mine" | "opponent";
  /** For `boardCountCompare`: which side is the right operand. Defaults to mine. */
  right?: "mine" | "opponent";
  /** For `zoneColorCount`: limit the battle-area color count to this card kind. */
  cardType?: "Digimon" | "Tamer" | "Option";
  /** For `zoneColorCount`: the supported aggregation is distinct card colors. */
  unit?: "distinctColors";
  /** For `digiXrosCount`: the DigiXros must have used at least this many material cards. */
  minimum?: number;
  /** Exact producer card for `triggerPlayedByEffectSource`. */
  sourceCardId?: string;
  /**
   * several independent checks (e.g. P-116's three `HasMatchConditionOwnersPermanent`
   * for distinct named Digimon in play — a true AND, NOT the OR a single multi-name
   * filter would express).
   */
  conditions?: Condition[];
  /** For `not`: the predicate to negate. */
  condition?: Condition;
  /** For `selfHasInDigivolutionCards`: the name/trait refs to match against the stack. */
  nameOrTrait?: { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" }[];
  /** For `bindingEmpty` / `bindingExists`: the name of the binding to check (written by a preceding action's `bindResultAs`). */
  ref?: string;
  /** For `namedCountAtLeast`: the name a preceding action's `trackCount` wrote into `namedCounts`. */
  countSource?: string;
  /**
   * For `selfHasNameContaining`: the source permanent's top-card name must contain any of these
   * strings as a substring. True when at least one matches (OR logic). (BT20-080)
   */
  names?: string[];
  /** For `selfHasNameContaining`: names that disqualify an otherwise matching host. */
  excludeNames?: string[];
  /** For `selfHasKeyword`: the live keyword/mechanic the source permanent must carry. */
  keyword?: string;
  /** Required deletion cause for `triggerRemovalCause`. */
  removalCause?: "byEffect" | "byBattle" | "byRule";
  raw?: string;
  matchPredicate?: string;
}

/**
 * A cost paid as part of an action ("by trashing 1 card", "by suspending this
 * Tamer", "by returning ...", "by placing ..."). Modeled as a nested action
 * the interpreter performs first; if it cannot be paid the parent action does
 * not happen.
 */
export interface Cost {
  kind:
    | "trash"
    | "suspend"
    | "unsuspend" // unsuspend a permanent (usually "By unsuspending this Digimon", BT14-054)
    | "return"
    | "place"
    | "deleteOwn"
    | "payMemory"
    | "flipSecurity" // flip your top face-up security card face down (BT23-043, EX11-031)
    | "trashSecurityTop" // trash your own top security card (ST23-05)
    | "securityToHand" // add your top/bottom security card to hand as a cost
    | "placeAsSecurity" // move a permanent to the security stack as a cost (BT19-048)
    | "playFromDigivolutionCards" // play a selected card from a selected Digimon's stack as a cost (BT19-102)
    | "raw";
  target?: Target;
  /** Host permanent selected before resolving a stack-card play cost (BT19-102). */
  hostTarget?: Target;
  /** For "payMemory": the memory amount paid (e.g. "By paying 1 cost" => 1). */
  memory?: number;
  /**
   * controller may decline to pay, and the effect still resolves with no payment).
   * Distinct from a "You may" on the whole action.
   */
  optional?: boolean;
  raw?: string;
  /**
   * Return destination for `kind:"return"` costs. `"deckBottom"` sends the card to the bottom
   * of its owner's deck instead of the hand (BT19-002). Absent defaults to hand.
   */
  to?: "hand" | "deckBottom";
  /**
   * After the `return` cost is paid, store the returned Digimon's level in
   * `EffectContext.namedCounts` under this name so a subsequent `levelLte` filter
   * can compare against it (BT19-002 "returnedDigimonLevel").
   */
  storeAs?: string;
  /**
   * After a cost moves cards, store how many cards were actually paid under this
   * name so a later scaling/countSource can read it. Used by "by placing up to N
   * cards ... reduce by X for each card placed" costs.
   */
  trackCount?: string;
  /** Destination for place costs: "under one of your Tamers" → {controller:"mine",kind:["Tamer"]}. */
  underFilter?: Filter;
  /**
   * Alternative host filters unioned with `underFilter` ("1 of your Digimon that's level 3
   * OR has the [Legend-Arms] trait" — EX6-007/EX6-009): a destination Digimon qualifies if it
   * matches `underFilter` OR any entry here. Mirrors `Target.orFilters`, threaded through the
   * `host:"target"` resolution the same way.
   */
  underOrFilters?: Filter[];
  /**
   * Routing for a "place ... as a cost" payment whose destination is NOT the default
   * digivolution stack of the source/underFilter host. When set, the chosen card(s)
   * are moved here instead:
   *   - "security": onto the controller's security stack (BT23-045, BT24-040, BT25-044).
   *   - "digivolutionStack": under a host's digivolution stack at `position`
   *     (EX9-055 "as this Digimon's top digivolution card"; EX9-064 bottom, face down).
   * `position` picks the end ("top"/"bottom"); `host` selects whose stack
   * ("self" = the source permanent, "target" = the `underFilter` host). `faceDown`
   * forces a face-down placement for the "security" destination (digivolution cards
   * are always face-down regardless). Absent => the legacy placeUnder behavior.
   */
  destination?: "security" | "digivolutionStack";
  /**
   * Which end of the target to place at: "top", "bottom", or "choice"
   * (prompt the controller to choose top or bottom per placed card). EX12-077's
   * "as 1 of your Digimon's top or bottom digivolution cards" uses "choice".
   * `"faceUpBottom"` is for `placeAsSecurity` cost only: bottom of the security stack,
   * placed face-up (BT19-048 "as the face-up bottom security card").
   */
  position?: "top" | "bottom" | "choice" | "faceUpBottom";
  /**
   * `"self"`: place under the source permanent.
   * `"target"`: place under the permanent identified by `underFilter` (legacy string form).
   * `{ filter, count }`: player picks a destination permanent matching the filter (BT21-071
   *   "as 1 of your Digimon's bottom digivolution card" where the host is not self).
   */
  host?: "self" | "target" | { filter: Filter; count: number };
  faceDown?: boolean;
  /** True when a place cost relocates a battle-area permanent rather than a loose card. */
  targetIsPermanent?: boolean;
  /** Store the selected digivolution-stack host permanent id for a downstream target.fromSelectionRef. */
  bindHostAs?: string;
  /**
   * For a `destination:"security"` place cost: store the instance ids actually placed under
   * this name in `EffectContext.boundPlayed`, so a downstream action can reference the exact
   * card(s) this cost moved (mirrors `Action.bindResultAs` for a cost-side move).
   */
  bindResultAs?: string;
}

/** Scaling clause: repeat/scale the amount "for each/every N of <filter>". */
export interface Scaling {
  per: number; // "for every 2 ..." => 2; "for each ..." => 1
  /** Add this amount per computed unit instead of multiplying the action's base amount. */
  bonus?: number;
  /** Add this much to a Delete action's maximum level for each computed scaling unit. */
  levelCeilingAdd?: number;
  /**
   * The counted pool. Source-local units (`digivolutionCards`) and result-bound units
   * (`usePaidCount`) do not need one.
   */
  filter?: Filter;
  /**
   * What is counted to produce the multiplier:
   *   - "cards": battle-area permanents matching `filter`.
   *   - "colors": distinct colors among the cards matching `filter`.
   *   - "security": cards in the relevant security stack (filter.controller).
   *   - "trash": cards in trash matching `filter`.
   *   - "digivolutionCards": digivolution-stack cards of the source.
   *   - "selfFaceDownDigivolutionCards": FACE-DOWN digivolution-stack cards of the source only
   *     (EX9-061 "for every 2 of this Digimon's face-down digivolution cards" — distinct from
   *     "digivolutionCards", which counts the whole stack regardless of face state).
   *   - "digivolutionCardColors": distinct colors among the SOURCE permanent's
   *     digivolution-stack cards (BT18-018 "for every color in this Digimon's
   *     digivolution cards"). Counts colors, not cards.
   *   - "digivolutionCardsOfFiltered": digivolution-stack size of ONE battle-area
   *     permanent matching `filter` (the one with the LARGEST stack when multiple
   *     match). Used when the counted permanent is NOT the source (BT19-100 "for
   *     each of 1 of your [Mother D-Reaper]'s digivolution cards").
   *   - "linkCards": total LINKED cards across the battle-area permanents matching
   *     `filter` ("for each of your link cards" — BT25-075). Counts the cards in each
   *     matching permanent's `linked` list, not the permanents themselves.
   *   - "namedCount": a count previously stored in `EffectContext.namedCounts`.
   */
  unit:
    | "cards"
    | "colors"
    /**
     * Battle-area permanents matching `filter`, collapsing same-named ones to one
     * ("for each of your red Tamers with different names" — BT21-082; documented behavior
     * `Combinations.GetUniqueNameCardCount`).
     */
    | "distinctNames"
    | "security"
    | "trash"
    | "digivolutionCards"
    | "selfFaceDownDigivolutionCards"
    | "digivolutionCardColors"
    | "selfAndDigivolutionCardColors"
    | "digivolutionCardsOfFiltered"
    | "linkCards"
    | "deletedThisEffect"
    | "namedCount";
  /** Name to read when `unit` is `"namedCount"` (usually written by a prior `trackCount`). */
  countSource?: string;
  /**
   * Use the count of cards actually PAID by the preceding action cost (the `out.paidCount`
   * of an "up to N" cost) as the raw multiplier, instead of evaluating `filter` against the
   * live board (BT17-041 "for every Tamer this effect suspended"). When set, `filter`/`unit`
   * are ignored for the raw count.
   */
  usePaidCount?: boolean;
  /**
   * count expression — BT7-040: "the memory cost is equal to the number of cards in
   * your security stack. If you have 0 security cards, the memory cost is 1"
   * (`if (count <= 0) count = 1`). Omitted => no floor (a count of 0 stays 0).
   */
  floor?: number;
  /**
   * For a `DeleteLevelBudget` action: how much to add to the base budget per `per` units counted
   * by this scaling ("for every 2 [Argomon] in its digivolution cards, add 1 to the maximum",
   * BT17-051). When set, the scaling drives a budget add rather than an amount/count multiplier.
   */
  budgetAdd?: number;
}
