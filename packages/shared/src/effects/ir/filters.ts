// Card/permanent predicates (`Filter`) and the selection shape (`Target`).

import type { Keyword } from "./keywords.js";
import type { Condition, Cost, Scaling } from "./predicates.js";

export type Controller = "mine" | "opponent" | "any";

export type ZoneRef =
  | "battleArea"
  | "hand"
  | "trash"
  | "deck"
  | "security"
  | "breeding"
  | "digivolutionCards"
  /** All cards under any of the controller's Tamers. */
  | "underMyTamers"
  /** Alias for `underMyTamers` (BT19-026 PlayWithoutCost). */
  | "underTamers"
  /** Cards under the specific Tamer executing this effect. */
  | "underThisTamer"
  /** Alias for `underMyTamers` (BT19-081 PlaceUnder). */
  | "underTamer"
  /** Digivolution cards under Tamers only, unlike `digivolutionCards` which spans all permanents. */
  | "digivolutionCardsUnderTamers"
  /** ＜Link＞ cards. As a `filter.zone`, resolves to the link cards of matching hosts, not the hosts. */
  | "linked"
  /** The prior reveal step's batch (`ctx.lastRevealedCards`), not a real zone. */
  | "revealed";

/** A DP threshold ("with 6000 DP or less", "as much or less DP as this"). */
export interface DpComparison {
  op: "lte" | "gte" | "eq";
  value?: number;
  /** Compare to the effect source's DP. */
  relativeToSource?: boolean;
  /** Permanent-id binding written by a prior action's `bindResultAs`. */
  valueFrom?: string;
  /** Hint for `valueFrom`; only `dp` is interpreted. */
  valueField?: "dp" | string;
}

export type FilterKeyword = Keyword;

/**
 * Which cards/permanents a target picks out. All fields are optional and AND
 * together; an empty Filter matches any card in scope.
 */
export interface Filter {
  /** Cost-only: the stack card's level must be represented at least twice. */
  sameLevelPair?: boolean;
  /** Narrows an onDeletionOf watcher to deletion by DP reaching 0. */
  deleteCause?: "dpReachedZero";
  /**
   * Level ceiling snapshotted from the `whenPlayed` subject, so it survives later level
   * changes or that Digimon leaving play (ST10-06, KB Q737/Q738).
   */
  levelLteTriggerSource?: boolean;
  /** Exact-level counterpart of `levelLteTriggerSource`. */
  levelEqTriggerSource?: boolean;
  /** Printed play-cost ceiling snapshotted from the `whenPlayed` subject. */
  playCostLteTriggerSource?: boolean;
  controller?: Controller;
  /**
   * Seat scope guessed for targets whose prose carried no controller predicate (`controller`
   * must stay unset — it is part of the structural signature). Read only for seat enumeration,
   * never for matching.
   */
  controllerDefault?: Controller;
  zone?: ZoneRef;
  kind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /** Alias for `nameOrTrait: [{ match: "trait" }]`. */
  traits?: string[];
  /** Any printed trait contains any token (case-insensitive). */
  traitContains?: string[];
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /**
   * "non-X" predicate, applied after `colors`. A 3+ color card carrying X is still excluded,
   * which is why this is not expressed by listing the other six colors (P-155, BT14-097, EX4-070).
   */
  excludeColors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /** Requires a multicolored card; with `colors`, must ALSO include those colors. */
  multicolor?: boolean;
  /** Exact level list, e.g. [5,6,7] for "level 5 or higher". */
  levels?: number[];
  /**
   * Max printed cost of an applicable digivolution route into this card. Evaluated against the
   * chosen base, so alternate requirements count; runtime cost reductions do not.
   */
  digivolutionCostMax?: number;
  /**
   * "level N or lower/higher". `relativeTo:"lastDeleted"` binds the threshold to the level of
   * the Digimon just deleted in this resolution — the cost-deleted one (BT8-107) or the
   * SubTrigger deletion subject (BT17-071).
   */
  levelComparison?: {
    op: "lte" | "gte" | "eq";
    value?: number;
    relativeTo?: "lastDeleted";
    /** Runtime bonus added to `value` before comparison. */
    scaling?: Scaling;
  };
  /**
   * Level ceiling. String form looks the bound up in `EffectContext.namedCounts` at evaluation
   * time (e.g. `"returnedDigimonLevel"` from a prior return cost's `storeAs`).
   */
  levelLte?: string | number;
  /** Level equality counterpart of `levelLte`. */
  levelEq?: string | number;
  dp?: DpComparison;
  /** Compare against the permanent suspended by the preceding suspend cost/action. */
  dpLessOrEqualToSuspendedDigimon?: boolean;
  /**
   * Compare an attribute against a PRIOR selection bound via `Target.bindAs`. An unresolved
   * `selectionRef` makes the candidate fail, never match everything.
   */
  relativeTo?: {
    attr: "dp" | "level" | "playCost" | "digivolutionCount";
    op: "lte" | "gte" | "eq";
    selectionRef: string;
  };
  playCostLte?: number;
  /** "with a play/use cost of N or more" (EX9-068). */
  playCostGte?: number;
  /** OR-of-exact-values ("a memory cost of 1 or 7", ST6-04). There is no OR-of-ranges. */
  playCostOneOf?: number[];
  /**
   * Runtime bonus added to `playCostLte` (EX5-054); the cap is `(playCostLte ?? 0) + scaleFactor`.
   * Needs game state, so it is honored only where a permanent is matched.
   */
  playCostLteScaling?: Scaling;
  /**
   * DP bound matched against the card's PRINTED DP rather than a permanent's live DP, for
   * filters evaluated while the cards are still in hand/deck (RestrictPlay, EX7-014).
   */
  dpAtMost?: number;
  /** "this Digimon" / "this card". */
  isSelfRef?: boolean;
  hasDnaDigivolutionRequirement?: boolean;
  /**
   * As a PlaceUnder `underFilter` inside a `wouldBePlayed` Replacement: host is the card that
   * triggered the event (`TriggerInfo.wouldBePlayedCardId`), i.e. the Digimon being played (BT19-081).
   */
  isTriggerSource?: boolean;
  /**
   * As a PlaceUnder `underFilter` outside a Replacement: host is whatever the preceding
   * `PlayWithoutCost`/`Play` played in this same resolution (EX9-005), read from
   * `EffectContext.lastPlayedPermanentIds` instead of prompting.
   */
  lastPlayed?: boolean;
  /**
   * `[Bracket]` refs from the clause. `nameExact` is literal card-name equality, so
   * "[Cerberusmon]" excludes "Cerberusmon: Werewolf Mode".
   *
   * Entries AND by default. One entry carrying `orPrevious` switches the WHOLE array to OR
   * ("[Data] or [Witchelny] trait" — BT19-029, BT19-055, BT21-054, BT21-080).
   */
  nameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "text" | "any";
    orPrevious?: boolean;
    /** "non-[X]" (BT10-069): qualifies a candidate that does NOT match. */
    negate?: boolean;
  }[];
  /**
   * Loose-candidate only: face-down OR carrying the trait (EX9-073). Reads the live `faceUp`
   * flag, so `candidateLooseInstances` honors it and `definitionMatches` cannot.
   */
  faceDownOrTrait?: { tokens: string[]; match: "trait" };
  /** Card must HAVE these keywords, printed or granted. */
  keywords?: FilterKeyword[];
  /** Card must NOT have these keywords ("Digimon without ＜Blocker＞"). */
  excludeKeywords?: FilterKeyword[];
  /**
   * Card must carry a ＜Link＞ requirement of its own. Matched against the DEFINITION
   * (`linkRequirement` non-empty and not `'-'`), because the requirement is a structured header
   * that never appears in `effectText`.
   *
   * This is the Q6422 gate (BT25-089's [Main] link). A trait approximation would be wrong: a
   * card may carry [Appmon] yet have no link requirement.
   */
  hasLinkRequirement?: boolean;
  /**
   * Card must define a `digiXrosRequirement` header, checked via `digiXrosRequirementFor(cardId)`
   * rather than the printed text (BT19-081, BT19-087).
   *
   * The prose compiler emits either spelling; the interpreter reads both fields.
   */
  hasDigiXrosRequirements?: boolean;
  /** Singular-spelling alias for `hasDigiXrosRequirements` (CAP-H-05, BT19-087). */
  hasDigiXrosRequirement?: boolean;
  /** `inheritedEffectText` is non-empty (BT18-090). Matched against the definition. */
  hasInheritedEffects?: boolean;
  suspended?: boolean;
  unsuspended?: boolean;
  /** "other than [DoruGreymon], [BurningGreymon], ...": excluded even if the rest matches. */
  excludeNames?: string[];
  /**
   * Exclusion spanning name/trait/text (EX10-035), each ref carrying its own `match` mode.
   * `excludeNames` is name-substring only.
   */
  excludeNameOrTrait?: { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" }[];
  /** "a non-Token Digimon" / ＜Save＞'s "not a Token" guard. */
  excludeToken?: boolean;
  /** "your Tokens or Digimon with [Puppet]". */
  includeToken?: boolean;
  /**
   * A Token satisfies the filter regardless of its trait gate (the ＜Overclock＞ delete cost's
   * "your Tokens OR your other [Trait] Digimon"). Tokens have no printed trait; non-Token cards
   * still must match it.
   */
  allowTokens?: boolean;
  /** "another", "other". */
  excludeSelf?: boolean;
  /**
   * Leave-prevention `sourceFilter` only: fire only for effect-caused leaves. Absent means no
   * cause gate here; the action-level `leaveCause` stays authoritative.
   */
  leaveReason?: "effect";
  /**
   * `wouldBeReturned` SubTrigger `sourceFilter` only (CAP-C-11): fire only for these
   * destinations. Absent means any destination.
   */
  returnDestination?: Array<"hand" | "deck" | "trash">;
  /**
   * Inside a Replacement body: resolve to the permanent that triggered the replacement
   * (`ctx.trigger.deletedPermanentId` / `subjectPermanentId`) rather than scanning the board.
   * BT19-053 places the Royal Base Digimon that is about to leave, not a generic match.
   */
  useTriggerSource?: boolean;
  /**
   * `"hasNone"` is the explicit complement of `"hasAny"` (BT17-064, BT17-100); `"hasAny"` also
   * covers the Mind Link guard's "no Tamer cards" reading when combined with kind Digimon.
   */
  digivolutionCards?: "none" | "hasNone" | "hasAny";
  /** Alias for `digivolutionCards: "hasAny"` (BT17-098). */
  hasDigivolutionCards?: boolean;
  /**
   * The STACK contains a card of one of these kinds (BT17-090). Distinct from
   * `digivolutionCards:"hasAny"`, which only asks whether the stack is non-empty.
   */
  digivolutionStackKind?: string[];
  /**
   * Name/trait refs matched against cards UNDER the top card. `nameOrTrait` matches the TOP
   * card instead — BT9-095/097 need the [X Antibody] Option in the stack, not the name on top.
   */
  digivolutionStackNameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "text" | "any";
    orPrevious?: boolean;
    negate?: boolean;
  }[];
  /** Reject the permanent if any card under its top matches these names (BT17-100). */
  excludeCardsNamed?: string[];
  /**
   * `definition.level` is a number > 0. Excludes Lv.- cards (Digi-Eggs, level-less Digimon) —
   * KB Q2807/Q2928.
   */
  hasLevel?: boolean;
  /**
   * Counting-mode flag for `permanentCount`: reduce the matched set to distinct card NAMES
   * before comparing to the threshold (BT21-010). Does not change WHICH permanents match.
   */
  distinctNames?: boolean;
  /**
   * Shares the source's live top-card NAME (BT2-053) — the evolved-into name, not the printed
   * card id (KB Q1023). An off-field source matches nothing. Usually paired with `excludeSelf`.
   */
  isSameName?: boolean;
  /**
   * Compare stack size against the effect source's ("as many or fewer digivolution cards as
   * this Digimon" — AD1-025, BT16-027). An unresolvable source excludes the candidate.
   */
  digivolutionCardsCompareToSource?: "lte" | "gte" | "eq";
  /**
   * Printed play cost must be <= the source's stack size (BT7-065). An off-field source
   * excludes all candidates.
   */
  playCostLteSourceDigivolutionCards?: boolean;
  /** Stack size at most N (BT20-055). Distinct from `digivolutionCards:"none"` (exactly 0). */
  digivolutionCardsAtMost?: number;
  /** Stack size at least N (BT1-085). */
  digivolutionCardsAtLeast?: number;
  /**
   * Server-side narrowing applied AFTER base eligibility, to the extremum of the eligible pool
   * (ties: all extrema eligible). Candidates lacking the attribute are excluded; if none has it
   * the set is empty (KB BT23-024 Q6025/Q6026). A client intent naming a permanent outside the
   * resolved set is rejected. EX10-073 / BT25-076 (Q6373), BT23-024.
   */
  superlative?:
    | "highestPlayCost"
    | "lowestPlayCost"
    | "highestDP"
    | "lowestDP"
    | "highestLevel"
    | "lowestLevel"
    | "highestDigivolutionCards"
    | "lowestDigivolutionCards";
  /**
   * With `zone: "digivolutionCards"`, the predicate the HOST permanent must satisfy for its
   * stacked cards to be included ("from under your Tamers", BT10-093).
   */
  hostFilter?: Filter;
  /**
   * Pre-fills one DnaDigivolve material slot with the source ("this Digimon and any of your
   * other Digimon", BT21-046). `materials.isSelf` takes precedence when set.
   */
  includesSelf?: boolean;
  /**
   * Restrict to permanentIds in the named binding written by a preceding `bindResultAs`.
   * An unbound or empty ref matches nothing — never invent targets.
   */
  boundRef?: string;
  /**
   * The complement of `boundRef`: exclude permanents bound under these `SelectBind`/`bindAs`
   * handles ("delete all other Digimon" after choosing exemptions — EX11-011 binds one
   * exemption per player under different names). Matching ANY named binding excludes.
   */
  excludeSelectionRef?: string | string[];

  // Fields below are alternative shapes emitted by the action-handler compiler
  // (tools/lib/action-handlers/). The interpreter normalizes them to the canonical fields
  // above at match time. Keep in sync with effects.json.

  /** `{ max }`, `{ min, max }`, `{ op, value }`, or `"same"` (same level as source). */
  level?: { max?: number; min?: number; op?: "gte" | "lte" | "eq"; value?: number | string } | string;
  /** Shorthand for `kind: ["Digimon"]`. */
  digimon?: boolean;
  /** Shorthand for `kind: ["Tamer"]`. */
  tamer?: boolean;
  /** Shorthand for `colors`. */
  color?: string | string[];
  /** Shorthand for `nameOrTrait`. */
  name?: string | { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" };
  /** Shorthand for `nameOrTrait` with match "trait". */
  trait?: string | string[];
  /** String form of `nameOrTrait`. */
  traitOrName?: string[];
  /** Older handlers' spelling of `controller`. */
  owner?: string;
  /** Older handlers' spelling of `zone`. */
  location?: string | string[];
  /** Source zone(s) for play/place targets. */
  from?: string | string[];
  /** Nested filter, used in or-filter groups. */
  filter?: Filter;
  or?: Filter[];
  and?: Filter[];
  not?: Filter;
  cardType?: string;
  // There is deliberately no `playedByThisEffect` filter. "The Digimon this effect played" is
  // expressed by `DelayedDelete`/`DelayedDeletePlayed` (which read ctx.lastPlayedPermanentIds)
  // or by `bindResultAs` + `boundRef`. The old field was read by no engine source, so every
  // filter carrying it silently matched EVERY permanent.
  /**
   * `relativeToLeavingDigimon: N` means the candidate's playCost must equal the triggering
   * leaving Digimon's playCost + N (BT19-099 ＜Delay＞ body, KB Q3175).
   */
  playCost?:
    | number
    | { op: string; value: number }
    | { op: string; relativeToLeavingDigimon: number }
    | { lteBindResult: string };
  maxPlayCost?: number;
  /** Alternative name for `maxPlayCost`. */
  playCostMax?: number;
  /** "cannotBeSuspended", "cannotAttack", etc. */
  restriction?: string;
  /** "Vaccine", "Virus", "Data", etc. */
  attribute?: string | { type: string };
  source?: string;
  notSelf?: boolean;
  isSuspended?: boolean;
  isDigimon?: boolean;
  isDigiEgg?: boolean;
  dpLessOrEqual?: number;
  levelGreaterOrEqual?: number;
  levelLessOrEqual?: { op: string; value: number } | number;
  /** For cost-check conditions. */
  memoryCost?: number;
  /** Singular form of `keywords`. */
  keyword?: string | string[];
  /**
   * Matches against the union of name, traits, effect text, and inherited text; an array is
   * OR-matched. KB Q4363/Q4366 confirm the "in its text" span (CAP-E10, BT20-044).
   */
  textContains?: string | string[];
  /** Main effect text only, excluding inherited and security text. */
  effectTextContains?: string | string[];
  hasInheritedEffect?: boolean;
  isOpponentHand?: boolean;
  digivolutionPosition?: string;
  digivolution?: boolean;
  fromDigivolution?: boolean;
  /**
   * `whenPlayed` sourceFilter only: the play must be EFFECT-driven
   * (`TriggerInfo.playedByEffect`), which a manual play never sets. Encodes "when an effect
   * plays [X]" (KB Q3665/Q6034, EX5-058/EX5-062/BT15-068), unlike a bare "when your opponent
   * plays a Digimon" watcher, which omits this field and fires on any play.
   */
  byEffect?: boolean;
  /** Alternative to `excludeNames`. */
  exclude?: string[];
  excludeKind?: string[];
  /** Alternative to `excludeNameOrTrait`. */
  notTrait?: string[];
  /**
   * Position within the zone stack; only meaningful for `zone: "security"`, where `"top"` is
   * the card checked next (index 0). Without it, any security card qualifies (BT19-029, BT20-080).
   */
  position?: "top" | "bottom";
  /**
   * Digivolution-stack loose candidates within the BOTTOM N positions (EX9-073), rather than
   * the single card `position: "bottom"` selects.
   */
  withinBottomN?: number;
  type?: { kind: string };
  /** Used in or-filter groups. */
  count?: number | "all" | { op: string; value: number };
  amount?: number | string;
  top?: boolean;
  faceUp?: boolean;
  differentColors?: boolean;
  colorCount?: number;
  /** For nested targets. */
  targetCount?: number;
  useCost?: { op: string; value: number };
  condition?: Condition;
  cost?: Cost;
  target?: Target;
  upTo?: boolean;
  op?: string;
  isLowestDP?: boolean;
  isOpponents?: boolean;
  /** Hint for runtime resolution. */
  selector?: string;
  placedByThisEffect?: boolean;
  /**
   * An Option permanent that reached the battle area via a "place this card in the battle area"
   * effect (Cap-E-006, BT23-055). Options only ever get there that way, so this matches any
   * battle-area Option; `placedByThisEffect` scopes to THIS effect instance instead.
   */
  placedInBattleAreaByEffect?: boolean;
  /**
   * Deleted by the immediately preceding `DeleteByDPBudget` in this resolution, read from
   * `ctx.lastDeletedByThisEffectIds` and further narrowed by any other predicates here.
   */
  deletedByThisEffect?: boolean;
  nameContains?: string;
  /**
   * Level equals the current attacker's, resolved at activation time; false when no attack is
   * in progress (EX12-069).
   */
  sameLevelAsAttacker?: boolean;
  /**
   * Inherited-effect SubTrigger `sourceFilter` only (BT2-059): the event subject must share its
   * name with the HOST permanent's top card. KB Q1024 — "this Digimon" in inherited text means
   * the host's current top-card name.
   */
  nameMatchesInheritedHost?: true;
}

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
