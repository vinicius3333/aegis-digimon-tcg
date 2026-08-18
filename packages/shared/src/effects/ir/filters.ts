// Card/permanent predicates (`Filter`) and the selection shape (`Target`).

import type { Keyword } from "./keywords.js";
import type { Condition, Cost, Scaling } from "./predicates.js";

/** Whose cards a clause refers to. */
export type Controller = "mine" | "opponent" | "any";

/** Where the referenced cards live. */
export type ZoneRef =
  | "battleArea"
  | "hand"
  | "trash"
  | "deck"
  | "security"
  | "breeding"
  | "digivolutionCards"
  /** All cards stacked under any of the controller's Tamer permanents. */
  | "underMyTamers"
  /**
   * Alias for `underMyTamers` — cards placed under any of the controller's Tamer
   * permanents (the DigiXros/Xros Heart zone). Used by BT19-026 PlayWithoutCost.
   */
  | "underTamers"
  /** Cards stacked under the specific Tamer permanent executing this effect. */
  | "underThisTamer"
  /**
   * Alias for `underMyTamers` — cards placed under any of the controller's Tamer permanents.
   * Used by BT19-081 PlaceUnder target filter ("select cards from under your Tamers").
   */
  | "underTamer"
  /** Digivolution cards stored under any of the controller's Tamer permanents (DigiXros materials under a Tamer zone). Sourced exclusively from Tamer permanents, unlike `digivolutionCards` which spans all permanents. */
  | "digivolutionCardsUnderTamers"
  /**
   * Cards attached to a permanent's link zone (`CardInstance.linked` / `permanent.linked`
   * ArraySchema) — the ＜Link＞ cards. When a cost/target `filter.zone` is `linked`, the resolved
   * cards are the link cards of the matching HOST permanents, not the hosts themselves.
   */
  | "linked"
  /**
   * Cards revealed by a prior reveal step, held in `ctx.lastRevealedCards` rather than a real
   * zone. Lets a `for each` scaling clause count "for each revealed [X]" (a `Filter.zone` on the
   * revealed batch) instead of the current battle-area/hand/etc state.
   */
  | "revealed";

/** A DP threshold for targeting (e.g. "with 6000 DP or less", "as much or less DP as this"). */
export interface DpComparison {
  /** "lte" => at most; "gte" => at least; "eq" => exactly. */
  op: "lte" | "gte" | "eq";
  /** Fixed numeric DP bound, when the text gives a number. */
  value?: number;
  /** True for "as much or less DP as this Digimon" (compare to the source's DP). */
  relativeToSource?: boolean;
  /**
   * Name of a permanent-id binding written by a prior action's `bindResultAs`.
   * Used for "with as much or less DP as the Digimon this effect played".
   */
  valueFrom?: string;
  /** Optional documentation hint for `valueFrom`; currently only `dp` is interpreted. */
  valueField?: "dp" | string;
}

/** The base keyword names a filter can require a card to carry ("with ＜Save＞ in its text", "Digimon with ＜Blocker＞"). */
export type FilterKeyword = Keyword;

/**
 * A predicate describing which cards/permanents a target picks out. All fields
 * are optional and AND together; an empty Filter matches "any card in scope".
 */
export interface Filter {
  /** Cost-only hint: a selectable stack card must belong to a level represented at least twice. */
  sameLevelPair?: boolean;
  /** Restrict an onDeletionOf watcher to deletion caused by DP reaching 0. */
  deleteCause?: "dpReachedZero";
  /**
   * Runtime level ceiling captured from the Digimon that caused the current `whenPlayed`
   * event. Unlike resolving the live permanent, the snapshot survives later level changes or
   * that Digimon leaving play before this effect resolves (ST10-06, KB Q737/Q738).
   */
  levelLteTriggerSource?: boolean;
  /** Exact-level counterpart used by "same level as the Digimon played from sources" watchers. */
  levelEqTriggerSource?: boolean;
  /** Printed play-cost ceiling captured from the Digimon that caused the current `whenPlayed` event. */
  playCostLteTriggerSource?: boolean;
  controller?: Controller;
  /**
   * Runtime-only resolution hint for targets whose prose carried NO explicit
   * predicate for these, so `controller` stays unset (it must not appear in the
   * structural signature), but the interpreter still needs a seat scope to resolve
   * the target — it falls back to this guessed default. Never read for matching/owner
   * predicates, only for seat enumeration.
   */
  controllerDefault?: Controller;
  zone?: ZoneRef;
  /** Restrict by card kind. */
  kind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /** Restrict by trait token. Alias for `nameOrTrait: [{ match: "trait" }]`. */
  traits?: string[];
  /** Match when any printed trait contains any token (case-insensitive). */
  traitContains?: string[];
  /** Restrict by card color. */
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /**
   * Color-EXCLUSION predicate ("a non-red Option card", "a non-white Digimon"). A card is
   * `!card.Colors.Contains(Color.Red)` guard. Evaluated after `colors` (include), so an empty
   * list has no effect. Distinct from enumerating the six allowed colors in `colors` — the
   * exclude form is the faithful encoding of "non-X" (KB: a 3+ color card with X is still
   * excluded). Cards: P-155 (non-red Option), BT14-097 (non-white Digimon), EX4-070.
   */
  excludeColors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /**
   * True when the clause requires a MULTICOLORED card ("a multicolored Digimon").
   * When combined with `colors`, the card must be multicolored AND include those
   * colors (e.g. "a multicolored Digimon that is blue or red").
   */
  multicolor?: boolean;
  /** Restrict by Digimon level (exact list, e.g. [5,6,7] for "level 5 or higher"). */
  levels?: number[];
  /**
   * Maximum printed cost of an applicable digivolution route into this card. This is
   * evaluated by the Digivolve action against its chosen base, so both ordinary EvoCost
   * rows and matching alternate requirements count; runtime cost reductions do not.
   */
  digivolutionCostMax?: number;
  /**
   * Level comparison when the text says "level N or lower/higher". `value` is the static bound.
   * `relativeTo:"lastDeleted"` instead binds the threshold dynamically to the level of the
   * Digimon just deleted in this resolution — the cost-deleted Digimon (BT8-107 "delete 1 of
   * your Digimon to delete 1 of your opponent's Digimon with a level less than or equal to the
   * deleted Digimon's level") or the SubTrigger deletion subject (BT17-071 "when one of your
   * other Digimon is deleted, delete 1 with level ≤ the deleted Digimon's"). The interpreter
   * substitutes the concrete level at resolution time.
   */
  levelComparison?: {
    op: "lte" | "gte" | "eq";
    value?: number;
    relativeTo?: "lastDeleted";
    /** Runtime bonus added to `value` before comparison (e.g. +1 level cap per other Digimon). */
    scaling?: Scaling;
  };
  /**
   * Level upper bound sourced from a named context variable (string) or a static number.
   * String form: the bound is looked up in `EffectContext.namedCounts` at evaluation time
   * (e.g. `"returnedDigimonLevel"` set by a prior `return` cost with `storeAs`).
   * Number form: equivalent to `levelComparison: { op: "lte", value: N }`.
   */
  levelLte?: string | number;
  /** Level equality bound sourced from a named context variable or static number. */
  levelEq?: string | number;
  /** DP threshold. */
  dp?: DpComparison;
  /**
   * Runtime DP threshold: compare the candidate to the permanent suspended by the immediately
   * preceding suspend cost/action in this effect resolution.
   */
  dpLessOrEqualToSuspendedDigimon?: boolean;
  /**
   * A constraint comparing a candidate's attribute to the attribute of a PRIOR selection
   * bound via `Target.bindAs` ("select A, then delete B with DP equal to or less than A's
   * bound` idiom. The interpreter resolves `selectionRef` against the runtime selection
   * store; an unresolved ref makes the candidate fail to match (never matches everything).
   */
  relativeTo?: {
    attr: "dp" | "level" | "playCost" | "digivolutionCount";
    op: "lte" | "gte" | "eq";
    selectionRef: string;
  };
  /** Play-cost upper bound ("with a play cost of N or less"). */
  playCostLte?: number;
  /** Play-cost lower bound ("with a play/use cost of N or more" — EX9-068). */
  playCostGte?: number;
  /**
   * Disjunctive exact play-cost match ("with a memory cost of 1 or 7" — ST6-04). The card
   * qualifies when its printed play cost equals ANY listed value. Distinct from the single
   * bounds `playCostLte`/`playCostGte`; there is no OR-of-ranges, only OR-of-exact-values.
   */
  playCostOneOf?: number[];
  /**
   * A RUNTIME bonus added to `playCostLte` ("for each card with [X] in its name in your
   * trash, add 1 to the maximum play cost this effect can choose" — EX5-054). The
   * effective cap is `(playCostLte ?? 0) + scaleFactor(scaling)`. Evaluated against the
   * live game state, so it is only honored where a permanent is matched (it needs context,
   * unlike the static `playCostLte`).
   */
  playCostLteScaling?: Scaling;
  /**
   * DP upper bound for a card-DEFINITION predicate ("Digimon with 6000 DP or less"),
   * matched against the card's printed DP rather than a battle-area permanent's live DP.
   * Used by the seat-level RestrictPlay prohibition (EX7-014) where the prohibited cards
   * are still in hand/deck when the filter is evaluated, so the live-DP `dp` comparison
   */
  dpAtMost?: number;
  /** The clause referred to the source card itself ("this Digimon" / "this card"). */
  isSelfRef?: boolean;
  /** Candidate card must declare a DNA Digivolution requirement. */
  hasDnaDigivolutionRequirement?: boolean;
  /**
   * When used as `underFilter` on a PlaceUnder inside a `wouldBePlayed` Replacement,
   * this flag resolves the host to the card/permanent that TRIGGERED the replacement event —
   * i.e. the Digimon being played. Exposed via `TriggerInfo.wouldBePlayedCardId`.
   * Used by BT19-081 to place cards under the Digimon being played via DigiXros.
   */
  isTriggerSource?: boolean;
  /**
   * When used as `underFilter` on a PlaceUnder inside a plain action sequence (not a
   * `wouldBePlayed` Replacement), this flag resolves the host to the permanent(s) played by
   * the immediately preceding `PlayWithoutCost`/`Play` action in the SAME effect resolution
   * ("place this Digimon as the PLAYED Digimon's bottom digivolution card" — EX9-005). Reads
   * `EffectContext.lastPlayedPermanentIds` instead of prompting a fresh target choice.
   */
  lastPlayed?: boolean;
  /**
   * Name/trait references from `[Brackets]` inside the clause, e.g.
   * "[Greymon] in its name" or "[Hybrid] trait". Resolved against the card DB
   * by the interpreter. `match` is "name" | "nameExact" | "trait" | "text" | "any" (nameExact = literal card-name equality, e.g. "[Cerberusmon]" excludes "Cerberusmon: Werewolf Mode").
   *
   * Multiple entries are AND-matched by default (the card must satisfy every ref). When ANY
   * entry carries `orPrevious: true`, the WHOLE array switches to OR semantics — the card
   * qualifies if it matches at least one ref. This expresses "[Data] OR [Witchelny] trait"
   * (BT19-029, BT19-055, BT21-054, BT21-080) without losing the AND default used by name+trait
   * conjunctions elsewhere.
   */
  nameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "text" | "any";
    orPrevious?: boolean;
    /**
     * Invert this ref's match ("non-[X]" — BT10-069's "non-[DarkKnightmon (X
     * Antibody)] Digimon card"). A negated ref qualifies a candidate that does NOT
     * match `tokens`/`match`, instead of one that does.
     */
    negate?: boolean;
  }[];
  /**
   * Loose-candidate-only match against a digivolution-stack card: qualifies when the card is
   * FACE-DOWN (regardless of trait) OR its definition carries the named trait ("its bottom 2
   * face-down or [Cyborg] trait digivolution cards" — EX9-073). Distinct from `nameOrTrait`,
   * which is a pure definition match; this also reads the loose card's live `faceUp` flag, so
   * it is only honored by `candidateLooseInstances` (zone `digivolutionCards`), not
   * `definitionMatches`.
   */
  faceDownOrTrait?: { tokens: string[]; match: "trait" };
  /**
   * Keyword-presence filter: the card must HAVE these keyword abilities, from
   * `with ＜Save＞ in its text` / `Digimon with ＜Blocker＞` clauses. Matched
   * against the card's printed (and granted) keywords by the interpreter.
   */
  keywords?: FilterKeyword[];
  /**
   * Keyword-exclusion filter: the card must NOT have these keyword abilities,
   * from clauses such as `Digimon without ＜Blocker＞`.
   */
  excludeKeywords?: FilterKeyword[];
  /**
   * The card must carry a ＜Link＞ requirement of its own — i.e. it CAN be linked to a
   * Digimon (documented behavior `CardSource.CanLink` is reachable only when `linkCondition != null`, which is
   * present iff the card defines an `IAddLinkConditionEffect`; the underlying card data is the
   * source `LinkRequirement` field, exported as `CardDefinition.linkRequirement`). Matched
   * against the card DEFINITION (`linkRequirement` non-empty and not the `'-'` sentinel), NOT
   * the printed effect text — the requirement is a structured header (`[Link] [Appmon] trait:
   * Cost N`) that never appears in `effectText`, so a trait/text scan cannot detect it.
   *
   * This is the faithful expression of the Q6422 gate (BT25-089's [Main] link: "the linked
   * card must carry ＜Link＞"), distinct from a `nameOrTrait` trait approximation (a card may
   * carry the [Appmon] trait yet have no link requirement — it cannot be linked).
   */
  hasLinkRequirement?: boolean;
  /**
   * The card must carry a ＜DigiXros＞ requirement of its own — i.e. it defines a
   * `digiXrosRequirement` ([DigiXros -N] [A] x [B] ...) header. Matched against the card
   * DEFINITION via the IR registry (`digiXrosRequirementFor(cardId)` non-empty), NOT the
   * printed text. The faithful expression of "Digimon with DigiXros requirements"
   * (BT19-081, BT19-087's [Composite]/[Twilight] Digimon "with DigiXros requirements" gate).
   *
   * Both spellings (`hasDigiXrosRequirements` plural and `hasDigiXrosRequirement` singular)
   * are accepted — the prose compiler may emit either (BT19-081 uses plural, CAP-H-05/BT19-087
   * uses singular). The interpreter checks both fields and applies the same definition lookup.
   */
  hasDigiXrosRequirements?: boolean;
  /** Singular-spelling alias for `hasDigiXrosRequirements` (CAP-H-05, BT19-087 sourceFilter). */
  hasDigiXrosRequirement?: boolean;
  /**
   * The card must carry at least one inherited (digivolution-source) effect — i.e. its
   * `inheritedEffectText` field is non-empty. Used to filter "Tamer cards with inherited
   * effects" (BT18-090). Matched against the card definition, not the printed effectText.
   */
  hasInheritedEffects?: boolean;
  /** Restrict to a SUSPENDED permanent ("1 of your opponent's suspended Digimon"). */
  suspended?: boolean;
  /** Restrict to an UNSUSPENDED permanent ("while your opponent has no unsuspended Digimon"). */
  unsuspended?: boolean;
  /**
   * Name-exclusion clause ("other than [DoruGreymon], [BurningGreymon], ..."):
   * a card matching any of these names is EXCLUDED even if it matches the rest.
   */
  excludeNames?: string[];
  /**
   * Name/trait/TEXT-spanning exclusion ("other than Digimon with [Dark Masters] in their
   * texts", EX10-035): a card whose definition matches ANY of these refs is EXCLUDED even if it
   * matches the rest. Distinct from `excludeNames` (name-substring only) — each ref carries its
   * own `match` mode, so a `match:"text"`/`"any"` ref excludes by the trait/effect-text union
   */
  excludeNameOrTrait?: { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" }[];
  /** Exclude tokens ("a non-Token Digimon" / Save's "not a Token" guard). */
  excludeToken?: boolean;
  /** Include tokens as an alternative ("your Tokens or Digimon with [Puppet]"). */
  includeToken?: boolean;
  /**
   * A Token satisfies this filter regardless of its `nameOrTrait`/`traits` gate — the
   * "your Tokens OR your other [Trait] Digimon" disjunction of the ＜Overclock＞ delete
   * cost (source `permanent.IsToken || TopCard.ContainsTraits(trait)`). A Token has no
   * printed trait, so without this it would fail the trait predicate; non-Token cards are
   * unaffected and still must match the trait.
   */
  allowTokens?: boolean;
  /** Exclude the source card itself ("another", "other"). */
  excludeSelf?: boolean;
  /**
   * For leave-prevention sourceFilter: restrict the replacement to only fire when the
   * target is leaving due to an effect (`"effect"` → `RemovalCause "byEffect"`). Absent
   * => no cause gate on the filter (the action-level `leaveCause` remains authoritative).
   * Only meaningful on `ReplacementAction.sourceFilter`; ignored in other filter contexts.
   */
  leaveReason?: "effect";
  /**
   * For `wouldBeReturned` SubTrigger sourceFilter (CAP-C-11): restrict to only fire when
   * the matching permanent WOULD BE returned to one of these destinations. Absent => no
   * destination gate (fires for any return destination). Only meaningful on a SubTrigger
   * sourceFilter whose event is `"wouldBeReturned"`; ignored in other filter contexts.
   */
  returnDestination?: Array<"hand" | "deck" | "trash">;
  /**
   * In a Replacement body context: resolve the target as the permanent(s) that triggered the
   * replacement (the leaving/affected permanent) rather than a fresh board scan. For QueenBeemon
   * (BT19-053): the Royal Base Digimon ABOUT TO LEAVE is the card placed as security, not a
   * generic board search. The engine reads `ctx.trigger.deletedPermanentId` (or
   * `subjectPermanentId`) as the replacement's trigger source. Absent/false => normal
   * board-scan resolution. Only meaningful inside a Replacement `actions` body.
   */
  useTriggerSource?: boolean;
  /**
   * Digivolution-stack constraint on a permanent target: `"none"`/`"hasNone"` => no
   * digivolution cards (`"hasNone"` is the explicit complement of `"hasAny"`, BT17-064/
   * BT17-100); `"hasAny"` => at least one digivolution card (or no Tamer cards when combined
   * with kind Digimon for Mind Link guards).
   */
  digivolutionCards?: "none" | "hasNone" | "hasAny";
  /** Alias for `digivolutionCards: "hasAny"` ("a Digimon WITH digivolution cards", BT17-098). */
  hasDigivolutionCards?: boolean;
  /**
   * Restrict to a permanent whose digivolution STACK contains at least one card of one of
   * these kinds ("a Digimon with a Tamer card in its digivolution cards", BT17-090). Distinct
   * from `digivolutionCards:"hasAny"` (any non-empty stack) — this checks the stacked cards' kinds.
   */
  digivolutionStackKind?: string[];
  /**
   * Name/trait predicate on cards UNDER a permanent's top card. The permanent qualifies when
   * at least one digivolution card matches these refs. This is distinct from `nameOrTrait`,
   * which matches the permanent's TOP card (BT9-095/097 require the exact [X Antibody] Option
   * in the stack, not an X-Antibody-form Digimon name on top).
   */
  digivolutionStackNameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "text" | "any";
    orPrevious?: boolean;
    negate?: boolean;
  }[];
  /**
   * Name-exclusion on the DIGIVOLUTION STACK: reject the permanent if ANY card under its top
   * carries a name matching one of these tokens ("[Diaboromon] without [Doomsday Clock] in its
   * digivolution cards", BT17-100). Substring match against the stacked cards' English names.
   */
  excludeCardsNamed?: string[];
  /**
   * Restrict to a card/Digimon that HAS a printed level (`definition.level` is a number > 0).
   * Excludes Lv.- cards (Digi-Eggs, level-less Digimon) — KB Q2807/Q2928. Used by level-budget
   * deletion and "1 of each Digimon with different levels" selectors.
   */
  hasLevel?: boolean;
  /**
   * Count DISTINCT card NAMES rather than total permanents when this filter is used by a counting
   * condition (`permanentCount`). "3 or more [Hero] trait Tamers WITH DIFFERENT NAMES" (BT21-010):
   * two permanents sharing a name count once. Purely a counting-mode flag — it does not change
   * which permanents MATCH, only how the matched set is reduced before comparing to the threshold.
   */
  distinctNames?: boolean;
  /**
   * Restrict to a permanent that shares the SOURCE permanent's current top-card NAME ("another
   * Digimon with the same name as this Digimon", BT2-053). Compares against the live evolved-into
   * top-card name, NOT the printed card id (KB Q1023). An off-field source matches nothing.
   * Typically paired with `excludeSelf` so the host itself is not counted.
   */
  isSameName?: boolean;
  /**
   * Comparative digivolution-stack-size gate relative to the EFFECT SOURCE Digimon: the candidate's
   * stack size is compared to the source's (`source.permanent().stack.length`). Encodes printed
   * wordings like "with as many or fewer digivolution cards as this Digimon" (lte — AD1-025,
   * BT16-027). An unresolvable source excludes the candidate.
   */
  digivolutionCardsCompareToSource?: "lte" | "gte" | "eq";
  /**
   * Dynamic play-cost upper bound relative to the EFFECT SOURCE Digimon's current stack size:
   * the candidate's printed play cost must be <= `source.permanent().stack.length`. Encodes
   * clauses like BT7-065's "play costs less than or equal to this Digimon's digivolution cards".
   * An off-field source excludes all candidates.
   */
  playCostLteSourceDigivolutionCards?: boolean;
  /**
   * Restrict to permanents whose digivolution STACK size is at most N (BT20-055:
   * "1 or fewer digivolution cards" → digivolutionCardsAtMost: 1). Distinct from
   * `digivolutionCards:"none"` (which requires stack.length === 0). A Digimon with
   * stack.length <= N passes; one with stack.length > N is excluded.
   */
  digivolutionCardsAtMost?: number;
  /**
   * Restrict to permanents whose digivolution STACK size is at least N (BT1-085:
   * "4 or more digivolution cards" → digivolutionCardsAtLeast: 4). A Digimon with
   * stack.length >= N passes; one with stack.length < N is excluded.
   */
  digivolutionCardsAtLeast?: number;
  /**
   * Superlative play-cost narrowing applied SERVER-SIDE after base eligibility: restrict the
   * candidate pool to the minimum (`"lowestPlayCost"`, EX10-073 / BT25-076 Q6373) or maximum
   * (`"highestPlayCost"`, BT23-024) printed-play-cost permanents (ties: all extrema eligible).
   * Candidates with no play cost are excluded; if none has a play cost the set is empty
   * (KB BT23-024 Q6025/Q6026 "all restricted, none exempt"). The resolver computes the
   * extremum over the eligible pool; a client intent naming a permanent outside the resolved
   * set is rejected (V5 input validation, threat T-08-01).
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
   * When `zone` is "digivolutionCards", filter the HOST permanent (Tamer/Digimon) by this
   * predicate. The host permanent's kind must match for cards in its stack to be included.
   * eligible when a clause says "from under your Tamers" (BT10-093).
   */
  hostFilter?: Filter;
  /**
   * Pre-selects the SOURCE permanent as one of the required materials for a DnaDigivolve action.
   * When `true`, one material slot is pre-filled with the source (self), and the controller
   * "this Digimon and any of your other Digimon" (BT21-046). Only meaningful on a DnaDigivolve
   * `materials` filter; `materials.isSelf` takes precedence when set.
   */
  includesSelf?: boolean;
  /**
   * Restricts candidates to permanents whose permanentId is in the named effect-result binding.
   * Written by a preceding action via `bindResultAs` (e.g. PlayPerLevel stores played permanentIds
   * under the name); a subsequent GainKeyword target reads it to act only on those permanents.
   * An unbound or empty ref matches nothing (conservative — we never invent targets).
   */
  boundRef?: string;
  /**
   * Excludes the permanent(s) bound under the named `SelectBind`/`Target.bindAs` handle(s)
   * from matching (the positive counterpart of `boundRef`). "delete all other Digimon" after
   * choosing exemptions via SelectBind (EX11-011: one exemption per player, chosen via two
   * SelectBind actions bound under different names). A single string or an array of names; a
   * permanent matching ANY named binding is excluded.
   */
  excludeSelectionRef?: string | string[];

  // --- Fields produced by the action-handler compiler (tools/lib/action-handlers/) ---
  // These are alternative shapes emitted by the LLM-generated handlers. The interpreter
  // normalizes them to the canonical fields above at match time. Keep in sync with
  // effects.json.

  /** Alternative level constraint: `{ max: N }`, `{ min: N, max: M }`, `{ op: "gte"|"lte"|"eq", value: N }`, or `"same"` (same level as source). */
  level?: { max?: number; min?: number; op?: "gte" | "lte" | "eq"; value?: number | string } | string;
  /** Alternative kind: `"Digimon"` (shorthand for `kind: ["Digimon"]`). */
  digimon?: boolean;
  /** Alternative kind: `"Tamer"` (shorthand for `kind: ["Tamer"]`). */
  tamer?: boolean;
  /** Alternative color: single color string (shorthand for `colors: ["Red"]`). */
  color?: string | string[];
  /** Alternative name ref: `"Greymon"` or `{ tokens: [...], match: "name" }` (shorthand for `nameOrTrait`). */
  name?: string | { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" };
  /** Alternative trait ref: `["Hybrid"]` (shorthand for `nameOrTrait` with match:"trait"). */
  trait?: string | string[];
  /** Alternative `nameOrTrait`: string form. */
  traitOrName?: string[];
  /** Alternative `controller`: "mine"/"opponent" as used by older handlers. */
  owner?: string;
  /** Alternative location/zone: "hand", "trash", "deck", "breedingArea", "digivolutionCards", etc. */
  location?: string | string[];
  /** Source zone(s) for play/place targets: "hand", "trash", etc. */
  from?: string | string[];
  /** Nested filter (used in or-filter groups). */
  filter?: Filter;
  /** OR-connected filter alternatives. */
  or?: Filter[];
  /** AND-connected nested filters. */
  and?: Filter[];
  /** Negated nested filter. */
  not?: Filter;
  /** Card type restriction: "Digimon", "Tamer", "Option". */
  cardType?: string;
  // NOTE: there is deliberately no `playedByThisEffect` filter. "The Digimon this effect played"
  // is expressed by the wired mechanisms instead: the `DelayedDelete` / `DelayedDeletePlayed`
  // actions (which read ctx.lastPlayedPermanentIds), or `bindResultAs` on the play action plus
  // `boundRef` on the later filter. The old field was never read by any engine source, so every
  // filter carrying it silently matched EVERY permanent.
  /**
   * Play cost bound: static number, `{ op, value }` comparison, or a runtime comparison where
   * `relativeToLeavingDigimon: N` means the candidate's playCost must equal the triggering
   * leaving Digimon's playCost + N (BT19-099 ＜Delay＞ body, KB Q3175).
   */
  playCost?:
    | number
    | { op: string; value: number }
    | { op: string; relativeToLeavingDigimon: number }
    | { lteBindResult: string };
  /** Max play cost as a number. */
  maxPlayCost?: number;
  /** Play cost max (alternative name). */
  playCostMax?: number;
  /** Restriction kind: "cannotBeSuspended", "cannotAttack", etc. */
  restriction?: string;
  /** Attribute restriction: "Vaccine", "Virus", "Data", etc. */
  attribute?: string | { type: string };
  /** Source zone filter: "hand", "trash", "digivolutionCards", etc. */
  source?: string;
  /** True for "is not self" gate. */
  notSelf?: boolean;
  /** True for suspended permanents. */
  isSuspended?: boolean;
  /** True for digimon-only filter. */
  isDigimon?: boolean;
  /** True for DigiEgg filter. */
  isDigiEgg?: boolean;
  /** DP bound as a plain number ("DP 6000 or less"). */
  dpLessOrEqual?: number;
  /** Level lower bound as a number. */
  levelGreaterOrEqual?: number;
  /** Level upper bound: `{ op: "lte", value: N }` or number. */
  levelLessOrEqual?: { op: string; value: number } | number;
  /** Memory cost filter (for cost-check conditions). */
  memoryCost?: number;
  /** Keyword presence (alternative singular form). */
  keyword?: string | string[];
  /**
   * Text-content filter: a single string or an array of strings. When an array,
   * a card matches if its full text (name ∪ traits ∪ effect text ∪ inherited text)
   * contains ANY of the listed strings (OR logic). KB Q4363/Q4366 confirm the
   * "in its text" semantics span all text fields. (CAP-E10, BT20-044)
   */
  textContains?: string | string[];
  /** Match only the card's main effect text, excluding inherited/security text. */
  effectTextContains?: string | string[];
  /** Card has an inherited effect. */
  hasInheritedEffect?: boolean;
  /** True for opponent's hand. */
  isOpponentHand?: boolean;
  /** Digivolution position constraint. */
  digivolutionPosition?: string;
  /** True to restrict to digivolution cards. */
  digivolution?: boolean;
  /** True to restrict to cards from digivolution. */
  fromDigivolution?: boolean;
  /**
   * `whenPlayed` sourceFilter only: restrict the subject to an EFFECT-DRIVEN play
   * (TriggerInfo.playedByEffect === true) — a manual hand/board play never sets this
   * marker (see `primitives.ts` play seams). Encodes "when an EFFECT plays [X]" (KB
   * Q3665/Q6034, EX5-058/EX5-062/BT15-068 family), distinct from a bare "when your
   * opponent plays a Digimon" watcher which fires on any play and omits this field.
   */
  byEffect?: boolean;
  /** Exclude array (alternative to excludeNames). */
  exclude?: string[];
  /** Exclude kind array. */
  excludeKind?: string[];
  /** Name/trait to exclude (alternative to excludeNameOrTrait). */
  notTrait?: string[];
  /**
   * Restrict to a card at a specific POSITION within its zone stack. Only meaningful for
   * `zone: "security"`: `"top"` = the card that would be checked next (index 0); `"bottom"`
   * = the last card. Without this, `zone: "security"` allows any security card. (BT19-029, BT20-080)
   */
  position?: "top" | "bottom";
  /**
   * For a digivolution-stack loose-candidate filter: restrict to cards within the BOTTOM `N`
   * positions of the host's stack ("its bottom 2 face-down or [Cyborg] trait digivolution
   * cards" — EX9-073), rather than the single bottom card `position: "bottom"` selects.
   */
  withinBottomN?: number;
  /** False when self is allowed. */
  type?: { kind: string };
  /** Count constraint (used in or-filter groups). */
  count?: number | "all" | { op: string; value: number };
  /** Amount field (context-dependent). */
  amount?: number | string;
  /** Top-of-deck constraint. */
  top?: boolean;
  /** Face-up constraint. */
  faceUp?: boolean;
  /** Different colors flag. */
  differentColors?: boolean;
  /** Color count constraint. */
  colorCount?: number;
  /** Target count for nested targets. */
  targetCount?: number;
  /** Use cost filter. */
  useCost?: { op: string; value: number };
  /** Condition nested in filter. */
  condition?: Condition;
  /** Cost nested in filter. */
  cost?: Cost;
  /** Target nested in filter. */
  target?: Target;
  /** Up-to flag for count. */
  upTo?: boolean;
  /** Zone field (alternative to `zone` for array form). */
  op?: string;
  /** True for lowest-DP superlative narrowing. */
  isLowestDP?: boolean;
  /** True for opponent-owned permanents. */
  isOpponents?: boolean;
  /** Selector hint for runtime resolution. */
  selector?: string;
  /** True when the card was placed by this effect. */
  placedByThisEffect?: boolean;
  /**
   * True when the permanent (an Option card) is in the battle area because a "place this card in
   * the battle area" effect put it there, rather than normal play (Cap-E-006, BT23-055's leave-
   * prevention cost "by trashing 1 of your Option cards in the battle area"). Distinct from
   * `placedByThisEffect` (which scopes to THIS effect instance). Options only ever reach the
   * battle area via such a placement effect, so this matches any battle-area Option permanent.
   */
  placedInBattleAreaByEffect?: boolean;
  /**
   * Restrict to permanents that were deleted by the immediately preceding `DeleteByDPBudget`
   * action in the same effect resolution. The executor stores the deleted permanent ids on
   * `ctx.lastDeletedByThisEffectIds`; the scaling resolver counts that set (filtered by any
   * additional predicates such as `kind`).
   */
  deletedByThisEffect?: boolean;
  /** Name-content filter: card name contains this string. */
  nameContains?: string;
  /**
   * Restricts candidates to cards whose level equals the current attacker's level.
   * Resolved against the open combat's attacker permanent at activation time;
   * returns false when no attack is in progress (EX12-069 "of the same level as
   * the attacking Digimon").
   */
  sameLevelAsAttacker?: boolean;
  /**
   * Only meaningful as a SubTrigger `sourceFilter` on inherited effects (BT2-059 Kurisarimon).
   * When true, the played card (event subject) must share its name with the HOST permanent's
   * top card — i.e. "another Digimon with the same name as this Digimon" where "this Digimon"
   * is the Digimon whose digivolution stack contains the card bearing this inherited effect.
   * KB Q1024: "this Digimon" in inherited text refers to the host's current top card name.
   */
  nameMatchesInheritedHost?: true;
}

/** A resolved target specification for an action. */
export interface Target {
  filter: Filter;
  /** How many to affect; default 1. `"all"` for "all ...". */
  count: number | "all";
  /** Who makes a non-trivial permanent choice. Defaults to the effect's controller. */
  chooser?: "controller" | "opponent";
  /** Add to numeric `count` when a condition/scaling clause applies. */
  countModifier?: {
    amount: number;
    condition?: Condition;
    scaling?: Scaling;
  };
  /**
   * When set on a hand-zone Trash target, trash cards until the hand contains
   * exactly this many cards (`max(0, handSize - untilHandSize)` cards are trashed).
   * The player chooses which cards to trash. Overrides `count` on the Trash path.
   * (CAP-E12, BT20-077: "trash cards from your hand until you have 4 left")
   */
  untilHandSize?: number;
  /** "up to N" rather than exactly N. */
  upTo?: boolean;
  /** The source card itself ("this Digimon", "this card"). */
  isSelf?: boolean;
  /**
   * On a `Trash` target: trash each resolved permanent's TOP CARD, promoting the
   * digivolution card beneath it, rather than treating the permanent as a loose card.
   *
   * "Trash the top card of 1 of your Digimon" (BT8-110) and "trash 1 of your Digimon" reach
   * the interpreter as the same shape, and the two mean different things — the first purges a
   * layer and leaves the Digimon in play, the second does not. The prose compiler does not
   * yet make the distinction, so this is set by hand on the affected card's module. Absent
   * (the default) keeps the existing behaviour for every other card.
   */
  topCardOnly?: boolean;
  /**
   * Resolve to the permanent that TRIGGERED the enclosing SubTrigger event, instead of
   * running a filter-based candidate search. When set inside a SubTrigger body, the
   * interpreter returns the engine's recorded `subjectPermanentId` (the Digimon that
   * digivolved/attacked/was played etc.). Useful when a Tamer's SubTrigger must act on
   * the specific permanent that drove the event, not on a filter match.
   */
  sourceRef?: "triggerSubject" | "triggerDefender";
  /**
   * Bind the resolved permanent(s) under this handle so a LATER action's filter
   * (`Filter.relativeTo`) or host (`PlaceUnder.underSelectionRef`) can reference the chosen
   * capture in a `Mode.Custom` select. Provenance-free at the engine level: the interpreter
   * records the first resolved permanentId under this name for the duration of the effect.
   */
  bindAs?: string;
  /**
   * This target IS a permanent bound earlier under `Target.bindAs` (no fresh selection):
   * "place [the chosen Digimon A] under another Digimon". The interpreter resolves it to the
   * stored permanentId; `filter`/`count` are ignored. An unbound ref resolves to nothing.
   */
  fromSelectionRef?: string;
  /** Controller shorthand (alternative to filter.controller). */
  controller?: Controller;
  /** Source zone for play/place targets. */
  source?: ZoneRef | ZoneRef[];
  /** Total DP cap for budget-based targeting. */
  totalDpCap?: number;
  /**
   * Level-sum budget: select cards from the target filter whose printed levels sum to EXACTLY this
   * value (or at most this value when `upTo: true`). Used by PlayPerLevel's "return" cost target
   * ("9 levels' total worth of Digimon cards", BT20-098 errata — exactly 9, not up to 9).
   */
  totalLevels?: number;
  /** Location/zone shorthand (alternative to filter.zone). */
  location?: string | string[];
  /** Source zone(s) for the target. */
  from?: string | string[];
  /**
   * Carve a single survivor out of a `count: "all"` mass-target action ("delete all
   * of your opponent's Digimon EXCEPT 1", "delete all Digimon except 1 of both
   * players'"). `filter` scopes the pool the survivor is drawn from (may differ from
   * the action's own `filter` — e.g. EX11-046's main filter is the opponent's
   * Digimon, its `except.filter` narrows to their HIGHEST-play-cost ones).
   * `selector` picks among that pool: `"any"` is a free choice, `"highestPlayCost"`
   * narrows to the extremum first (ties still require a choice). `count` is the
   * number of survivors (both known cards spare exactly 1).
   */
  except?: {
    filter: Filter;
    count: number;
    /** Optional narrowing rule for the survivor pool. Omitted means any matching permanent. */
    selector?: "any" | "highestPlayCost";
    /** Who chooses the spared permanent when the pool is non-trivial. */
    chooser?: "controller" | "opponent";
  };
  /** True when this target is NOT the source itself. */
  isSelfRef?: boolean;
  /** Zone constraint on the target. */
  zone?: ZoneRef | ZoneRef[];
  /**
   * Within-target UNION: a candidate qualifies if it matches `filter` OR any of these alternative
   * filters ("play 1 [X] or 1 [Y]", BT17-074). Each alternative is a full `Filter` evaluated against
   * the same candidate pool; the player still chooses `count` cards from the combined match set.
   * Mirrors the `orFilters` field already on the RevealAdd add-spec.
   */
  orFilters?: Filter[];
  /** For loose-card costs: choose at most one card per printed name. */
  distinctNames?: boolean;
  /** For loose-card costs: choose at most one copy of each card number/card id. */
  distinctCardNumbers?: boolean;
  /** For loose-card costs: choose at most one card per printed level. */
  distinctLevels?: boolean;
  /** For loose-card costs: require one card for each listed printed name. */
  requiredNamesExact?: string[];
  /** Choose one card for each listed exact name that is available, requiring the maximum possible. */
  requiredNamesExactUpTo?: string[];
  /**
   * Reuse the permanent(s) chosen by the immediately preceding action in this effect's action list
   * rather than prompting for a fresh selection ("1 of your Digimon gains X … that Digimon also
   * gains Y until …"). When set, `filter`/`count` are ignored and the interpreter returns the
   * stored `lastResolvedPermanentIds` from the context. (CAP-A9, BT19-089.)
   */
  sameTarget?: boolean;
  /**
   * When true on a `Digivolve` action's `target`, resolve the digivolve BASE from the controller's
   * BREEDING zone rather than the battle area (BT20-018 Ouryumon: "1 of your Digimon in the
   * breeding area may digivolve"). The breeding permanent is moved to the battle area first, then
   * `digivolveFromInstance` stacks the chosen card onto it. KB Q4300: this does NOT trigger
   * [When Digivolving] effects — the effect is treated as a placement, not a normal digivolve.
   */
  targetBreeding?: true;
}
