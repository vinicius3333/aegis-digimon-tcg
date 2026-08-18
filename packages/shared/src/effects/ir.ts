// Declarative intermediate representation (IR) for card effect text.
//
// The compiler pipeline is: effect text (English prose) -> this IR -> the
// runtime interpreter (apps/api/src/engine/effects/interpreter.ts) which
// dispatches each Action to the existing effect primitives.
//
// The IR is deliberately a closed, serializable, discriminated-union model so
// that `runtime effect records` can emit it as JSON (effects.json) and the
// server can load and interpret it without re-parsing prose at runtime. Every
// union is discriminated on a string literal field so both the parser (plain
// JS) and the interpreter (TS) agree on the shape by structure alone.
//
// Scope (v1): breadth over depth. The high-frequency triggers, keywords, and
// clause verbs from the 4,201-card corpus are modeled with typed params; the
// long tail is captured verbatim as `RawUnparsed` so nothing is silently lost
// and coverage is measurable.

// ---------------------------------------------------------------------------
// Triggers and timing
// ---------------------------------------------------------------------------

/**
 * The closed set of trigger tags (the `[...]` window markers) after
 * normalization. Mirrors the corpus' ~27 distinct prose tags. `Static` is the
 * synthetic trigger for always-on continuous clauses that carry no tag (mapped
 * to EffectTiming.None by the interpreter). `Inherited`/`Security` are derived
 * from which text field the clause came from, not from a tag.
 */
export type EffectTrigger =
  | "OnPlay"
  | "BeforePayCost"
  | "WhenDigivolving"
  | "WhenAttacking"
  | "OnDeletion"
  | "EndOfAttack"
  | "AllTurns"
  | "YourTurn"
  | "OpponentsTurn"
  | "StartOfYourTurn"
  | "EndOfYourTurn"
  | "StartOfOpponentsTurn"
  | "EndOfOpponentsTurn"
  | "StartOfYourMainPhase"
  | "StartOfOpponentsMainPhase"
  | "EndOfAllTurns"
  | "Main"
  | "Security"
  | "Counter"
  | "Hand"
  | "Trash"
  | "Breeding"
  | "WhenMoving"
  | "Rule"
  | "Static"
  /** Fires on the surviving Digimon when it deletes an opponent's Digimon in battle. */
  | "WhenBattleDeleteOpponent"
  /** Fires when this card (an Option/Digimon in the battle area) is trashed while in the battle area. */
  | "whenTrashedFromBattleArea"
  /**
   * Fires on THIS card once an effect trashes it specifically from the security stack
   * (not a normal security check) — e.g. "when an effect trashes this card from the
   * security stack, you may play it without paying the cost" (BT15-037, BT18-098).
   * Maps to EffectTiming.OnDiscardSecurity, fired via GameEngine's
   * fireDiscardedFromSecurity once the card lands in trash (precedent: hand-written
   * ST22-10). Distinct from "Security" (a normal security-check reveal).
   */
  | "OnDiscardSecurity"
  /**
   * Fires on THIS Digimon (as attacker) when it is blocked — e.g. "[Your Turn] when
   * this Digimon is blocked, unsuspend it and gain 1 memory" (BT7-016). Maps to
   * EffectTiming.OnBlockAnyone, fired from combat/controller.ts's
   * switchDefenderToBlocker for every block regardless of who is watching; the
   * effect module itself must check it is the attacker (ctx.trigger.attackerPermanentId
   * equals its own permanent).
   */
  | "WhenBlocked";

/** Per-turn activation limit, from `[Once Per Turn]` / `[Twice Per Turn]`. */
export type EffectFrequency = "OncePerTurn" | "TwicePerTurn";

// ---------------------------------------------------------------------------
// Keywords
// ---------------------------------------------------------------------------

/**
 * The ~45 base keyword abilities (＜...＞) after normalizing spacing and the
 * `A.` -> `Attack` abbreviation. Numeric-parameterized keywords (Draw N,
 * De-Digivolve N, Security Attack ±N, Recovery +N, ...) carry their value in
 * the `Keyword` object's `amount`, so the enum itself stays small.
 */
export type Keyword =
  | "Blocker"
  | "Piercing"
  | "Rush"
  | "Raid"
  | "Reboot"
  | "Jamming"
  | "Retaliation"
  | "Barrier"
  | "Evade"
  | "Save"
  | "Delay"
  | "Alliance"
  | "Fortitude"
  | "Blitz"
  | "Collision"
  | "Vortex"
  | "Decoy"
  | "Scapegoat"
  | "Execute"
  | "Progress"
  | "IceClad"
  | "Training"
  | "Armor Purge"
  | "Mind Link"
  | "Ascension"
  | "BlastDigivolve"
  | "BlastDNADigivolve"
  | "Draw" // amount
  | "SecurityAttack" // amount (signed)
  | "DeDigivolve" // amount
  | "Recovery" // amount (Deck)
  | "DigiBurst" // amount
  | "Digisorption" // amount (signed)
  | "MaterialSave" // amount
  | "Link" // amount
  | "LinkMax"
  | "Fragment" // amount
  | "Partition"
  | "Decode"
  | "Overclock"
  | "UseReq"
  // EX-12 keyword: at the end of your turn, this Digimon may attack
  | "Engage"
  /**
   * PROVISIONAL — ＜Detach (trait)＞ (BT26-010/-019/-028/-037/-051/-063/-084). Zero occurrences
   * in the KB rules corpus (`node tools/kb/query.mjs rules "Detach"` and a grep of
   * `data/kb/rules/*.md` both come back empty) and zero occurrences in the source
   * documented behavior behavioral reference — the keyword is new to BT26 and unpublished as far as our sources go. Printed
   * text gives ONLY the trait restriction via the parenthetical note (CR §4-22-5's "notes"
   * convention, the same one that lets ＜Alliance (trait)＞ restrict which Digimon may be
   * suspended); every one of the 7 cards shows the bare tag with NO accompanying benefit or
   * timing text anywhere on the card. See `apps/api/src/engine/effects/detach.ts` for the
   * eligibility predicate this keyword's trait parameter drives, and the doc comment there for
   * the full reading and open questions. Not compiled by any card — no wave-2 card is implemented
   * against this entry; it exists so the shape is on record for when the KB refreshes.
   */
  | "Detach";

/** A keyword reference: the base keyword plus an optional numeric parameter. */
export interface KeywordRef {
  keyword: Keyword;
  /** Numeric param for parameterized keywords (Draw N, Security Attack ±N, ...). */
  amount?: number;
  /** Original ＜...＞ text, kept for keywords whose parenthetical param we do not model yet. */
  raw?: string;
  /**
   * Trait tokens from a keyword's parenthetical note (CR §4-22-5), e.g. ＜Detach ([Seven Code]
   * trait)＞ => ["Seven Code"]. Generic across any trait-parameterized keyword, not Detach-only —
   * see `apps/api/src/engine/effects/detach.ts` for the one current consumer.
   */
  traitFilter?: string[];
}

// ---------------------------------------------------------------------------
// Targets / filters
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Durations (subset mirrors EffectDuration; serialized as strings)
// ---------------------------------------------------------------------------

export type EffectDurationRef =
  | "forTheTurn" // until each turn end (the attacker's turn)
  | "forTheAttack" // compiler-emitted alias of untilEndOfAttack (UntilEndAttack)
  | "forThisAttack" // hand-authored alias of untilEndOfAttack (UntilEndAttack)
  | "untilYourTurnEnd" // UntilOwnerTurnEnd
  | "untilOpponentTurnEnd" // UntilOpponentTurnEnd
  | "untilEndOfAttack"
  | "untilEndOfBattle"
  | "nextDigivolveThisTurn"
  | "endOfOpponentTurn" // until the end of the opponent's turn
  | "permanent"; // maps to the never-clearing EffectDuration.Permanent (WR-03 / ENG-02)

// ---------------------------------------------------------------------------
// Conditions / costs / scaling
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ActionBase {
  /** Optional per-action gate (the clause-level "If ..."). */
  condition?: Condition;
  /** Optional cost paid to perform this action. */
  cost?: Cost;
  /**
   * Additional costs for the same action. Used for clauses such as
   * "By placing 1 [A] and 1 [B] ...".
   */
  additionalCost?: Cost;
  additionalCosts?: Cost[];
  /** Alternative costs where paying any one option satisfies the action. */
  costOptions?: Cost[];
  /** Scaling ("for each ...") applied to the action's amount/count. */
  scaling?: Scaling;
  /** True when the clause is prefixed "You may". */
  optional?: boolean;
  /**
   * When true and this optional action is declined, abort all subsequent
   * actions in the same sequence ("By trashing X, do Y" — declining the
   * trash prevents Y from firing).
   */
  abortOnDecline?: boolean;
  /** Diagnostic / provenance text from runtime record (ignored at runtime). */
  raw?: string;
}

export interface DrawAction extends ActionBase {
  kind: "Draw";
  controller: Controller;
  amount: number;
}
export interface GainMemoryAction extends ActionBase {
  kind: "GainMemory";
  amount: number; // negative => lose memory
  /**
   * Deferred one-shot: apply the memory change at the stated boundary instead of
   * immediately ("At the end of your turn, lose 3 memory" — BT1-021). The delayed
   * change still fires if the source permanent leaves the field first (KB Q882/Q883:
   * the effect has already activated).
   */
  at?: "endOfTurn";
}
export interface SetMemoryAction extends ActionBase {
  kind: "SetMemory";
  value: number;
}
/** Raise the opponent-side memory required to end the active turn (BT14-081). */
export interface SetTurnEndMemoryAction extends ActionBase {
  kind: "SetTurnEndMemory";
  minimum: number;
}
export interface DeleteAction extends ActionBase {
  kind: "Delete";
  target: Target;
  /** Controller whose permanents are deleted (for controller-less target shorthand). */
  controller?: Controller;
  /** Schedule the resolved target's deletion for the owner's end-of-turn window. */
  at?: "endOfTurn";
  /** Add to the target DP ceiling for each unit counted by this scaling clause. */
  dpCeilingScaling?: Scaling & { amount: number };
}
/**
 * Delete matching permanents until the remaining count equals a live resource count.
 * BT19-094: "Delete your opponent's Digimon until they have as many as the number
 * of your security cards." The target describes the candidate pool to reduce.
 */
export interface DeleteUntilCountAction extends ActionBase {
  kind: "DeleteUntilCount";
  target: Target;
  untilCountSource: "mineSecurityCount";
  /** Store the number of permanents actually deleted under this key. */
  trackCount?: string;
}
/**
 * Delete opponent permanents up to a TOTAL play-cost budget (P-094 Destromon).
 * The player selects permanents sequentially until the budget is exhausted, then
 * all selected permanents are deleted in one batch (one OnDestroyedAnyone window).
 * The budget value is computed by the card from its digivolution stack count;
 * the engine only enforces the budget cap (server-side accumulation).
 */
export interface DeleteBudgetAction extends ActionBase {
  kind: "DeleteBudget";
  /** Filter for eligible targets (opponent Digimon/Tamer). */
  filter: Filter;
  /** Maximum total printed play-cost cap for selected permanents. */
  budget: number;
  /** Whether the budget is "up to" (optional decline per pick) vs mandatory. */
  upTo?: boolean;
  /**
   * Optional scaling: adds `scaling.budgetAdd` to the effective budget per `scaling.per`
   * units counted by `scaling.filter` and `scaling.unit`. For BT19-096: unit "security"
   * with filter.faceUp adds 2 per face-up security card the controller has.
   */
  scaling?: Scaling;
}
/**
 * Reveal cards, choose one revealed card as a play-cost reference, then delete opponent
 * permanents up to that chosen card's printed play-cost budget before returning the
 * revealed cards to deck. Used by effects like BT14-067 Ebemon where the reference card
 * is not moved to hand/play/trash; it only supplies the dynamic budget.
 */
export interface RevealChooseDeleteBudgetAction extends ActionBase {
  kind: "RevealChooseDeleteBudget";
  /** How many cards to reveal from the top of the chosen player's deck. */
  revealCount: number;
  /** Whose deck is revealed relative to the effect controller. */
  revealController: "mine" | "opponent";
  /** Eligible revealed cards that may be chosen as the budget reference. */
  chooseFilter: Filter;
  /** Eligible battle-area permanents to delete under the computed play-cost budget. */
  deleteFilter: Filter;
  /** Whether the deletion is "up to" the budget. */
  upTo?: boolean;
  /**
   * Limit the number of deleted permanents after the revealed card establishes the play-cost cap.
   * Absent preserves the original total-budget behavior (BT14-067). `1` encodes "delete 1 whose
   * play cost is <= the chosen card's play cost" (BT9-105).
   */
  deleteCount?: number;
  /** Where all revealed cards are returned after the deletion step. */
  returnRevealed: "deckBottom" | "deckTop" | "deckTopOrBottom" | "trash";
  /** Whether the effect controller chooses the returned cards' order. */
  returnOrder?: "controllerChoice";
}
/**
 * Budget deletion by LEVEL ("delete any number of opponent Digimon whose levels add up to N or
 * less", BT17-051). Like `DeleteBudget` but the per-target cost is the candidate's printed LEVEL,
 * not its play cost. The effective budget = `baseBudget` plus an optional `scaling`-driven add
 * (`scaling.budgetAdd` per `scaling.per` units). `filter` should carry `hasLevel:true` to exclude
 * Lv.- Digimon (KB Q2807).
 */
export interface DeleteLevelBudgetAction extends ActionBase {
  kind: "DeleteLevelBudget";
  filter: Filter;
  baseBudget: number;
  upTo?: boolean;
}
/**
 * Budget deletion by DP ("delete any number of opponent Digimon whose DP totals 3000 or less",
 * BT19-011). The controller selects any combination of opponent Digimon whose DP values sum to
 * at most `baseBudget` (plus any active `AddToDPDeleteBudget` bonus on the source). All selected
 * permanents are deleted in a single batch. The ids of actually-deleted permanents are stored on
 * `ctx.lastDeletedByThisEffectIds` so a subsequent `GainMemory` with `scaling.filter.deletedByThisEffect`
 * can count them (CAP-A3).
 */
export interface DeleteByDPBudgetAction extends ActionBase {
  kind: "DeleteByDPBudget";
  target: Target;
  baseBudget: number;
  /**
   * Scales the budget up at resolution time: adds `per` DP for every card matching `filter`
   * (BT19-011 "increases by 2000 for each of your opponent's Digimon"). Note `per` is an
   * amount-per-card, NOT the divisor that `Scaling.per` represents. Omitted => no scaling.
   */
  budgetBonus?: {
    per: number;
    filter?: Filter;
    unit?: "cards" | "selfDigivolutionCards";
    /** For "for every N cards" style budget bonuses. Default 1. */
    perCount?: number;
  };
}
/**
 * Inherited continuous modifier (BT19-011): adds `amount` DP to the deletion budget of any
 * `DeleteByDPBudget` action executed by the Digimon that inherited this effect.
 * Stacks — multiple copies each contribute their `amount`. Stored via `ctx.fx.addDpDeleteBudget`
 * and read back by `ctx.fx.dpDeleteBudgetBonus` before the budget is computed.
 */
export interface AddToDPDeleteBudgetAction extends ActionBase {
  kind: "AddToDPDeleteBudget";
  amount: number;
}
export interface TrashAction extends ActionBase {
  kind: "Trash";
  target: Target;
  /** Controller whose cards are trashed (for controller-less target shorthand). */
  controller?: Controller;
  /**
   * When set, the interpreter stores the number of cards ACTUALLY trashed under
   * this name in `EffectContext.namedCounts` so a subsequent `dpCeilingModifier`
   * (or `RepeatPerCount`) can scale by the actual trash count. (CAP-E12/E13, BT20-077)
   */
  trackCount?: string;
  /** Bind the instance ids actually trashed for a later condition/action in this resolution. */
  bindResultAs?: string;
  /**
   * Before trashing the targeted permanent(s), return their digivolution-stack cards to the
   * bottom of the deck first (BT20-080-style "trash it; return its digivolution cards to the
   * bottom of the deck" onDeletion bodies) instead of letting them fall to the trash with the
   * top card as ordinary deletion does.
   */
  returnDigivolutionCardsFirst?: boolean;
  /**
   * Who PICKS which hand card(s) are trashed, for a `target.filter.zone === "hand"` discard.
   * `"controller"` (the DEFAULT, and the only behavior existing cards rely on) means the
   * effect's controller picks — matching "trash 1 of your opponent's cards in their hand"
   * (the controller reaches into the opponent's hand). `"opponent"` means the OWNER of the
   * hand picks their own card — "your opponent trashes 1 card in their hand" (BT13-079/
   * BT19-075/BT4-088/EX6-046/EX6-049/etc, KB-confirmed "your opponent chooses"). Distinct
   * from `target.filter.controller`, which only scopes WHICH seat's hand the candidates come
   * from; before this field existed both phrasings compiled to the identical target shape and
   * the interpreter always prompted the controller, silently upgrading the opponent's own
   * discard into the controller reaching into the opponent's hand.
   */
  chooser?: "controller" | "opponent";
}
export interface HandManipulationAction extends ActionBase {
  kind: "HandManipulation";
  op: "trashVariable";
  controller?: Controller;
  amount: number | "variable";
  /** Who picks which hand card(s) are trashed. See `TrashAction.chooser` for the full rationale. */
  chooser?: "controller" | "opponent";
}
export interface ReturnAction extends ActionBase {
  kind: "Return";
  target: Target;
  to: "hand" | "deckTop" | "deckBottom";
  /** Let the controller arrange multiple returned cards for the destination. */
  order?: "any";
  /** Loose source zones when cards may be returned from more than one zone. */
  from?: ZoneRef[];
  /**
   * For "return all digivolution cards of that Digimon to the bottom of the deck, then return
   * that Digimon" effects. The stack move uses the same selected permanent as `target`.
   */
  returnDigivolutionCardsFirst?: boolean;
  /** Store returned instance ids under this name for downstream `bindingContains`/`bindingExists`. */
  bindResultAs?: string;
  /**
   * Store the number of cards ACTUALLY returned under this name in
   * `EffectContext.namedCounts`, so a subsequent scaling clause can read it via
   * `unit: "namedCount"` ("gain 1 memory for each card returned", BT9-111 — distinct
   * from re-counting a live filter, which can overcount unrelated cards).
   */
  trackCount?: string;
}
export interface SuspendAction extends ActionBase {
  kind: "Suspend";
  target: Target;
  /**
   * When set, the interpreter stores the number of permanents actually suspended
   * (truely affected, not just targeted) under this name in `EffectContext.namedCounts`
   * so a subsequent `RepeatPerCount` action can loop that many times (BT2-041).
   */
  trackCount?: string;
  /**
   * Bind the ids actually suspended under this name in `EffectContext.boundPlayed`, so a later
   * action can reference "the Digimon this effect suspended" (mirrors `Return`/`PlayFromZone`).
   * Unlike the `sameTarget` workaround (which reuses `lastResolvedPermanentIds`), a real bind is
   * empty when suspension resolves 0 permanents — the downstream restriction then applies to
   * nothing, matching KB Q4791/Q4792 (EX9-037/038, BT9-056 edge case).
   */
  bindResultAs?: string;
}
/**
 * Execute a nested `action` once for each unit stored in the named counter written
 * by a prior `trackCount` action (BT2-041: repeat ModifyDP once per suspended Tamer).
 * Each iteration performs independent target selection ("a SEPARATE activation per
 * Tamer" — KB Q1014). `countSource` is the same name used in the prior `trackCount`.
 */
export interface RepeatPerCountAction extends ActionBase {
  kind: "RepeatPerCount";
  /** Name written by the prior `trackCount` action in `EffectContext.namedCounts`. */
  countSource: string;
  /** Alternatively derive the repeat count directly from the current board/zones. */
  countFilter?: Filter;
  /** The action to execute on each iteration (independent target selection per loop). */
  action: Action;
}
/**
 * Move a whole permanent (top card + digivolution stack + linked cards) across the
 * breeding/battle boundary as a card EFFECT — NOT the once-per-turn breeding-phase
 * player action. The permanent keeps its identity, stack, linked cards, and suspended
 * state; digivolution cards are NOT trashed and ＜Overflow＞ is NOT processed
 * (Comprehensive Rules §4-16 "Moving"; KB P-143 Q4250/Q4251/Q4256/Q4257, P-130 Q4242).
 *   - "toBreeding": the (self) target leaves the battle area for the empty breeding slot
 *     (P-143 [End of Your Turn]). `target` is the self permanent.
 *   - "toBattle": a chosen breeding-area Digimon moves to the battle area (P-130 [On
 *     Play]); `target` carries the eligibility filter (your breeding Digimon, level ≥ 3).
 */
export interface MovePermanentAction extends ActionBase {
  kind: "MovePermanent";
  direction: "toBreeding" | "toBattle";
  target?: Target;
}
/**
 * "Hatch a Digi-Egg" as a card EFFECT (BT8-091 [On Play]): flip the top card of the
 * controller's Digi-Egg deck into the EMPTY breeding slot as a fresh permanent
 * (Comprehensive Rules §4-17-1). The interpreter resolves this through the `hatch`
 * primitive (the Digi-Egg-deck seam `placeUnder`/loose-card helpers cannot serve).
 * No target — hatching is always into the controller's own breeding area.
 */
export interface HatchAction extends ActionBase {
  kind: "Hatch";
}
export interface UnsuspendAction extends ActionBase {
  kind: "Unsuspend";
  target: Target;
}
export interface ModifyDPAction extends ActionBase {
  kind: "ModifyDP";
  target: Target;
  amount: number; // signed
  duration: EffectDurationRef;
  /** Override continuous-pass inference for audited edge cases with a triggered duration. */
  continuous?: boolean;
}
/**
 * Suspend a Digimon as an activation cost, then add that Digimon's current DP
 * to the target for the current attack and grant any listed attack keywords.
 * This is the declarative form of Alliance-like "adds the suspended Digimon's
 * DP" effects (EX4-029/035/054).
 */
export interface AddDPFromSuspendedCostAction extends ActionBase {
  kind: "AddDPFromSuspendedCost";
  cost: Cost;
  dpSource: { kind: "suspendedTarget" };
  target: Target;
  duration: EffectDurationRef;
  alsoGainKeywords?: KeywordRef[];
}
/**
 * Set a permanent's ORIGINAL/base DP to an absolute value (distinct from the
 * signed-delta ModifyDP). The override REPLACES the printed base DP; signed DP
 * deltas from other effects layer on top of it, and between competing overrides
 * the most recently applied wins. KB: BT3-014 Q1056/Q1057 ("treated as 1000 DP",
 * a coexisting -1000 → 0 → deletion), BT22-007 Q4864 (16000 then -3000 → 13000),
 * Q4865 (a later original-DP override of 3000 → 3000).
 */
export interface SetBaseDPAction extends ActionBase {
  kind: "SetBaseDP";
  target: Target;
  value: number; // absolute base DP
  duration: EffectDurationRef;
}
export interface GainKeywordAction extends ActionBase {
  kind: "GainKeyword";
  target: Target;
  keyword: KeywordRef;
  duration: EffectDurationRef;
  /**
   * How many times the keyword is granted to each target. Defaults to 1.
   * Used by BT19-091 ("gains ＜Alliance＞ twice") — each extra grant adds one
   * additional security check when the keyword is Alliance.
   */
  count?: number;
  /**
   * Keep the grant active only while its recipient continues to match the original
   * target filter. Used by effects such as Beast Cyclone: losing Blocker/Reboot after
   * digivolution also removes the granted Security Attack bonus (KB Q1144).
   */
  whileMatchesTargetFilter?: boolean;
}
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
 * Grant a triggered effect to a chosen permanent for a duration (CAP-C-16, BT21-077).
 * The targeted permanent receives a new timed trigger — "gains '[Start of Your Main Phase]
 * This Digimon attacks'" — that fires through the SubTrigger bus when the matching timing
 * event occurs. Duration-scoped: the watcher is swept when the duration boundary passes
 * (e.g. `untilOpponentTurnEnd` → end of the opponent's next turn). `sameTarget: true` on
 * the target reuses the permanent(s) chosen by the immediately preceding action.
 */
export interface GainTriggeredEffectAction extends ActionBase {
  kind: "GainTriggeredEffect";
  /** The permanent(s) that receive the new triggered effect. */
  target: Target;
  /**
   * The trigger event name the granted effect watches (mapped to a SubTriggerEventName by the
   * interpreter's SUBTRIGGER_EVENT_MAP). "StartOfYourMainPhase" fires at the target's owner's
   * main-phase start.
   */
  gainedTrigger: string;
  /** The actions to run each time the granted trigger fires. */
  gainedActions: Action[];
  /** How long the granted triggered effect lasts before it is swept. */
  duration: EffectDurationRef;
}
export interface DelayedEffectAction extends ActionBase {
  kind: "DelayedEffect";
  trigger: "nextEndOfOpponentTurn";
  effect: Action;
}

/**
 * Grant a debuff aura to all opponent Digimon (P-075 rule implementation pattern).
 * Installs a SubTrigger watcher on each opponent permanent that matches the filter.
 * The aura fires when the watcher's event occurs and runs the aura's actions.
 */
export interface GrantAuraToOpponentsAction extends ActionBase {
  kind: "GrantAuraToOpponents";
  /** Filter for eligible opponent permanents (default: all Digimon). */
  filter?: Filter;
  /** Alternative: target specification for the aura. */
  target?: Target;
  /** The SubTrigger event the aura watches. */
  event: string;
  /** Actions to run when the aura fires. */
  actions: Action[];
  /** Duration the aura lasts. */
  duration: EffectDurationRef;
  /** Effect text for the aura (used by the GRANTEFFECT pattern). */
  effectText?: string;
}
/**
 * Expand DigiXros material source zones at BeforePayCost time (BT19-079 Taiki Kudo,
 * BT19-087 Nene Amano). When active, the DigiXros material-gathering code may source
 * cards from the additional `zones` (e.g. "from under your Tamers" for BT19-079,
 * "from under Tamers + trash" for BT19-087). The expansion is recorded per-seat for
 * `duration`; the play-card / DigiXros material-picking path reads it. For v1 the
 * record is the deliverable; the consumption path lives in the DigiXros subsystem.
 */
export interface DigiXrosMaterialZoneExpansionAction extends ActionBase {
  kind: "DigiXrosMaterialZoneExpansion";
  /** Additional zones to source DigiXros materials from. */
  zones: ZoneRef[];
  /** Duration the expansion lasts (typically UntilOpponentTurnEnd for [All Turns]). */
  duration: EffectDurationRef;
}
/**
 * Marks a `wouldBePlayed` Replacement's `additionalEffects`: when this card would be played,
 * cards in the controller's trash may also be placed as DigiXros materials (in addition to the
 * default hand / battle-area zones). BT21-030: "cards in your trash can also be placed for
 * DigiXros". Carried as an additional effect inside a `ReplacementAction.additionalEffects`
 * list so the DigiXros validator can detect it statically from the compiled IR without threading
 * runtime state.
 */
export interface AllowDigiXrosMaterialsFromTrashAction extends ActionBase {
  kind: "AllowDigiXrosMaterialsFromTrash";
}
export interface RevealAddAction extends ActionBase {
  kind: "RevealAdd";
  /** How many cards are revealed from the top. */
  revealCount: number;
  /**
   * Optional "digivolve into 1 revealed card" branch that precedes the normal add
   * dispositions. When declined (or unavailable), an add slot marked
   * `ifDigivolveDeclined` may resolve as the printed fallback (EX2-072 Blue Card).
   */
  digivolveOption?: {
    /** Filter for the revealed Digimon card used as the evolution card. */
    into: Filter;
    /** Optional restriction on the battle-area Digimon that may digivolve. */
    target?: Target;
    /** These effects currently digivolve without paying the evolution cost. */
    payCost: false;
    optional: true;
  };
  /**
   * What to do with matching revealed cards and how many. Several specs may apply
   * (e.g. "1 Digimon and 1 Tamer"). `to` is the disposition: add to hand (default),
   * trash, play without cost, or digivolve into (the "among them" play/digivolve forms).
   */
  add: {
    filter: Filter;
    /**
     * "Add 1 [X] trait or 1 Y card among them": exactly `count` cards taken from the
     * UNION of `filter` and every entry here (the player chooses which alternative).
     * A revealed card qualifies if it matches `filter` OR any `orFilters` entry — never
     * one from each (KB Q2625). Absent for the common single-criterion add.
     */
    orFilters?: Filter[];
    count: number | "all";
    /** Add to numeric `count` when a condition/scaling clause applies. */
    countModifier?: Target["countModifier"];
    to?: "hand" | "trash" | "play" | "digivolve" | "placeUnder" | "underTamer" | "security";
    /** For `to:"digivolve"`: which battle-area Digimon may receive the revealed card. */
    digivolveTarget?: Target;
    /** Place the selected revealed card at the top of security (BT6-100). */
    toTop?: boolean;
    /** The selected card is placed face down after being publicly revealed. */
    faceDown?: boolean;
    /**
     * For `to: "play"` ONLY: a play-cost REDUCTION (positive = cheaper, floored at 0 by
     * the play primitive) applied instead of a full `payCost: false` waiver ("play 1 [X]
     * among them with the cost reduced by N", BT25-074 — distinct from "without paying
     * the cost"). Absent => the existing fully-free play (`payCost: false`).
     */
    costDelta?: number;
    /**
     * Alternative dispositions for the same chosen revealed card: "add it to hand OR place it
     * as a bottom digivolution card". The card is selected once, then the controller chooses one
     * disposition from the default `to` plus these alternatives.
     */
    orDispositions?: {
      to: "hand" | "trash" | "play" | "digivolve" | "placeUnder" | "underTamer" | "security";
      underFilter?: Filter;
    }[];
    /**
     * "You may ..." among-them forms: the disposition is the player's choice, so they
     * may take fewer than `count` (down to zero) even when enough cards match. Without
     * it a numeric `count` only prompts when more cards match than are wanted, and
     * `count: "all"` takes every match — both forced, never declinable.
     */
    optional?: boolean;
    /** Compiler spelling for an explicit "up to N" disposition; equivalent to `optional`. */
    upTo?: boolean;
    /** Resolve this fallback slot only when `digivolveOption` was declined/unavailable. */
    ifDigivolveDeclined?: boolean;
    /**
     * For `to: "play"` free plays ONLY: select any number of matching revealed cards whose
     * SUMMED printed play cost is <= `costBudget`, instead of a fixed `count`. Encodes
     * "play ... whose total play costs add up to N or less" (BT11-044) and "play up to N play
     * cost's total worth of cards" (BT14-068). When set, `count` is ignored (the number of
     * cards is bounded by the budget, not a fixed quantity) and the selection is always
     * optional — the player may take fewer or zero (KB Q2085). The interpreter enforces the
     * budget server-side: a selection whose total play cost exceeds `costBudget` is rejected.
     */
    costBudget?: number;
    /**
     * When `to` is `"placeUnder"` or `"underTamer"`: filter identifying which of the controller's
     * permanents the card is placed beneath as a bottom digivolution card.
     * For `placeUnder`, absent means any of the controller's Digimon.
     * For `underTamer`, absent means any of the controller's Tamers.
     */
    underFilter?: Filter;
    /**
     * Minimum number of revealed cards matching this slot's filter required before the
     * slot is attempted. If fewer matching cards are revealed, the slot is skipped entirely.
     * Used for KB Q3114: "if only 1 applicable card is revealed, add it to hand only —
     * cannot place under a Tamer unless 2+ applicable cards are found." (BT19-055)
     */
    requiresMinRevealed?: number;
  }[];
  /** Move every revealed card matching this filter to trash before disposing of the rest. */
  trashFilter?: Filter;
  /** Where the rest go. */
  rest: "deckBottom" | "deckBottomAnyOrder" | "deckTop" | "deckTopOrBottom" | "trash";
  /**
   * Store the number of revealed cards actually added to hand under this name in
   * `EffectContext.namedCounts`, so a subsequent scaling/countSource clause can read it
   * ("... reveal 5 cards, add all [X] to hand. Gain 1 memory for each card added").
   */
  trackCount?: string;
  /** Store the number of revealed cards actually played for a following RepeatPerCount action. */
  trackPlayedCount?: string;
}
export interface RevealAction extends ActionBase {
  kind: "Reveal";
  /** Targeted reveal, e.g. "reveal 1 card in your hand" or "reveal the top card of your deck". */
  target?: Target;
  /** Shorthand for top-of-deck reveal clauses. */
  count?: number;
  /** Whose deck to reveal from when using the shorthand form. */
  controller?: Controller | "any";
  /** Shorthand source zone; currently only deck reveal is executable. */
  zone?: ZoneRef;
}
export interface SearchAction extends ActionBase {
  kind: "Search";
  controller: Controller;
  filter: Filter;
  count: number | "all";
  to?: "hand";
  /** Play the selected security cards instead of adding them to hand. */
  then?: {
    kind: "PlayWithoutCost";
    target: Target;
    payCost: false;
  };
  /** Search source zone when it is not the default deck search. */
  searchZone?: ZoneRef;
  /** Semantic purpose for searches whose results feed a following action. */
  purpose?: string;
  /** Bind the instance ids actually found/moved for a later action in this resolution. */
  bindResultAs?: string;
}

/** Search the controller's security stack and optionally play one matching card from it. */
export interface SearchSecurityAction extends ActionBase {
  kind: "SearchSecurity";
  target: Target;
  then: {
    kind: "PlayWithoutCost";
    source: "security";
    payCost: false;
    optional?: boolean;
  };
}

/** Ask the opponent whether to trash their top security card and remember a decline. */
export interface OpponentMayTrashSecurityAction extends ActionBase {
  kind: "OpponentMayTrashSecurity";
}
export interface DeDigivolveAction extends ActionBase {
  kind: "DeDigivolve";
  target: Target;
  /**
   * Fixed peel count, or the dynamic form "＜De-Digivolve 1＞ for each of this Digimon's
   * face-down digivolution cards" (EX9-043) — resolved at run time as the SOURCE permanent's
   * face-down digivolution-stack card count.
   */
  amount: number | { kind: "countFaceDownDigivolutionCards"; host: "self" };
  /**
   * "You can't trash past level N cards" — the De-Digivolve stops peeling once the
   * card it would promote to the new top is at-or-below this level (that card is left
   * in place rather than trashed). Absent => peel up to `amount` times unconditionally.
   */
  stopAtLevel?: number;
}
export interface DigivolveAction extends ActionBase {
  kind: "Digivolve";
  /** What digivolves ("this Digimon", "1 of your Digimon"). */
  target: Target;
  /** Into what (filter on the card digivolved into). */
  into?: Filter;
  /**
   * Where the card digivolved INTO comes from ("from your hand", "from your trash"),
   * (hand). Provenance for the digivolve source zone; the interpreter resolves the pool.
   */
  from?: ZoneRef[];
  /**
   * Whether the digivolve pays a cost. Normally a boolean. A legacy prose-compiler encoding stores
   * the fixed digivolution cost as a NUMBER ("for a digivolution cost of N" -> payCost:N), which the
   * interpreter normalizes to {@link DigivolveAction.costOverride}. Prefer `payCost:true` +
   * `costOverride` in new IR.
   */
  payCost: boolean | number;
  /**
   * Cost reduction folded INTO the digivolve verb ("... for the digivolution cost ...
   * `reduceCostTuple`. This is part of the digivolve (NOT a separate ChangeCost effect),
   * so it does not constitute a standalone cost-modifier construct.
   */
  costDelta?: number;
  /**
   * When `from` includes `"security"`, the default path only allows face-up security
   * cards (BT19-084 semantics). Setting this to `true` permits digivolving into a
   * `canLookReverseCard: true`, allowing the controller to see and pick face-down cards.
   */
  faceDownSecurityOk?: boolean;
  /** Restrict the source card to cards revealed by the immediately preceding Search. */
  amongPreviousSearch?: boolean;
  /** Alternative digivolve cost reduction ("reduce the digivolution cost by N"). */
  reduceCost?: number;
  /**
   * Cost reduction folded into the digivolve verb whose AMOUNT is counted at resolution time
   * ("for each of your red Tamers with different names, reduce this effect's digivolution cost
   * by 1" — BT21-082). Mirrors the documented behavior `reduceCostTuple` being computed and passed into the
   * digivolve call, so it must NOT be modelled as a separate `wouldDigivolve` replacement: a
   * replacement installed alongside the action cannot reach the action's own digivolve.
   * Stacks with the fixed `reduceCost`/`costDelta`.
   */
  reduceCostScaling?: Scaling;
  /** Target card to digivolve onto (alternative name for into). */
  onto?: Filter;
  /** True when ignoring digivolution requirements. */
  ignoreReqs?: boolean;
  /** Cost override for the digivolution. */
  costOverride?: number;
  /** Level to treat the digivolving Digimon as for requirements. */
  asLevel?: number;
  /** True when ignoring digivolution requirements. */
  ignoreRequirements?: boolean;
  /** True when ignoring digivolution requirements (alternative name). */
  ignoreDigivolutionRequirements?: boolean;
  /** Ignore only the ordinary level requirement while preserving the action's explicit filters. */
  ignoreLevelRequirement?: boolean;
  /** Require the card digivolved into to share at least one color with the chosen base. */
  colorsMatchDigivolvingSource?: boolean;
  /** Store the resulting permanent id under this name for downstream `filter.boundRef`/conditions. */
  bindResultAs?: string;
}
export interface AttackAction extends ActionBase {
  kind: "Attack";
  target: Target; // who attacks ("this Digimon", "1 of your Digimon")
  withoutSuspending?: boolean;
  /** True when the attack may target the player directly. */
  attackPlayer?: boolean;
  /** The attack subject. */
  subject?: Target;
  /** The attacker (alternative name for target). */
  attacker?: Target;
  /**
   * The Digimon that attacks is the same one chosen by the immediately preceding
   * action in this effect's sequence — no new target selection prompt.
   * The `target.sameTarget` field on `Target` carries this at the target level;
   * this top-level alias is surfaced for card authors who put it on the action
   * (BT19-091). The interpreter reads `target.sameTarget` in `resolvePermanentTargets`.
   */
  sameTarget?: boolean;
  /**
   * The resolved Digimon must attack if it is legally able to — the player cannot
   * decline (KB Q3163 on BT19-091: "must attack if possible").
   * `forceAttack` already enforces the attack unconditionally; this field is
   * declarative state (recorded for auditing/logging) and causes no additional
   * runtime gate.
   */
  mandatory?: boolean;
  /** Drain the remaining effects in this timing window while the declared attack is still open. */
  drainTimingWindowDuringAttack?: boolean;
}
/**
 * "1 of your Digimon may battle 1 of your opponent's Digimon" — a DIRECT battle (a §14 DP
 * comparison; the loser, or both on a tie, is deleted), NOT an attack: no attack declaration,
 * Per KB (Q6348/Q6278/Q5955) the battle is a rule, so it bypasses effect-immunity on the
 * chosen permanents. Distinct from AttackAction (which runs the full attack lifecycle).
 */
export interface BattleAction extends ActionBase {
  kind: "Battle";
  /** Who battles ("this Digimon", or a chosen friendly Digimon). */
  attacker: Target;
  /** Whom it battles (a chosen opponent Digimon). */
  defender: Target;
  /** Alternative: combined target specification. */
  target?: Target;
}
export interface PlaceUnderAction extends ActionBase {
  kind: "PlaceUnder";
  /** Cards placed as digivolution cards / under a Tamer. */
  target: Target;
  underFilter?: Filter;
  /**
   * True when the placed card is the TOP card of the controller's Digi-Egg deck rather than
   * a loose card resolved by `target` (BT13-007 / EX6-006 "place the top card of your
   * Digi-Egg deck as this Digimon's bottom digivolution card"). The interpreter routes this
   * through the `placeUnderFromEggDeck` primitive and ignores `target` as a card source (the
   * source permanent / `underFilter` still selects the host). Distinct from `targetIsPermanent`.
   */
  fromEggDeck?: boolean;
  /**
   * True when the placed card is the TOP card of the controller's MAIN deck (ST23-13, ST23-14:
   * "place the top card of your deck face down under this Tamer"). The interpreter takes
   * `player.deck[0]` — no selection prompt. Distinct from `fromEggDeck`.
   */
  fromDeckTop?: boolean;
  /**
   * With `fromEggDeck`: place the Digi-Egg-deck top as the host's TOP digivolution card (REVEALED),
   * rather than the default BOTTOM placement (BT22-007 "place [Mother Eater]s as this Digimon's TOP
   * digivolution cards" — KB Q4856). When `target.filter` carries a name/trait predicate the egg-deck
   * non-matching top is returned to the deck untouched. Routed through `placeAsTopFromEggDeck`.
   */
  asTop?: boolean;
  /**
   * True when `target` is itself a battle-area PERMANENT being relocated under the host
   * Digimon under another of their Digimon" form), rather than loose cards from hand/trash.
   * The interpreter resolves `target` as a permanent and moves its whole stack under the host.
   */
  targetIsPermanent?: boolean;
  /**
   * The host permanent B is itself a prior selection (`Target.bindAs`), e.g. the second
   * `Mode.Custom` select whose predicate is `permanent != selectedPermanent`. When set the
   * interpreter uses the bound permanent as the host instead of resolving `underFilter`.
   */
  underSelectionRef?: string;
  /** Position in the stack: "top" or "bottom". */
  position?: string;
  /** Let the controller arrange multiple selected cards before they are placed in the stack. */
  order?: "any";
  /**
   * The card is placed FACE DOWN ("place 1 Digimon card from your trash face down as this
   * Digimon's bottom digivolution card", EX9-043). Descriptive: the placeUnder primitive
   * already marks effect-placed loose cards face-down; the flag preserves the printed intent
   * and feeds face-down-count readers (DeDigivolveAction's dynamic amount).
   */
  faceDown?: boolean;
  /** Source zone for the cards to place under. */
  source?: string;
  /** Store the selected destination/host permanent id for downstream actions (e.g. "the Digimon this was placed under attacks"). */
  bindHostAs?: string;
  /**
   * Source zones for the cards selected by `target` (BT19-038: `["hand", "trash"]`).
   * When set, narrows the loose-card pool; absent falls back to the legacy hand/trash/deck sweep.
   * Distinct from `target.from`, which some older IR records use for the same purpose.
   */
  from?: ZoneRef[];
  /**
   * Explicit destination permanent — the permanent UNDER WHICH the target card is placed.
   * When set, the player selects a permanent matching this filter as the host; when absent the
   * source permanent (or `underFilter`) is the host. BT19-038: "place 1 Tamer you control
   * under 1 of your [Xros Heart]/[Blue Flare] Digimon" uses this to select the destination
   * Digimon independently of the placed card's filter.
   */
  destination?: { filter: Filter; count: number };
  /**
   * When true, the placed cards are DigiXros materials for the Digimon being played
   * (the trigger source of the `wouldBePlayed` Replacement). They are placed under that
   * Digimon via the DigiXros materials slot, not as a normal digivolution-stack placement.
   * Used by BT19-081 inside a `wouldBePlayed` Replacement to extend the legal material pool
   * to include cards from under the controller's Tamers.
   */
  asDigiXrosMaterial?: boolean;
  /**
   * Store the number of cards actually placed under a name so a later `scaling`
   * (`unit:"namedCount"`) or `levelComparison.scaling` can read it (EX6-015: "for each card
   * placed in this Digimon's digivolution cards, add 1 to the level this effect may return").
   */
  trackCount?: string;
}
/**
 * "Trash the top/bottom digivolution card of <target>" — remove one of a permanent's
 * `the effect runtime.TrashDigivolutionCardsFromTopOrBottom(isFromTop)` form; distinct
 * from De-Digivolve (which sends the TOP card to the deck and reverts a stage) — this
 * removes a SOURCE card and the Digimon's stage is unchanged.
 */
export interface TrashDigivolutionAction extends ActionBase {
  kind: "TrashDigivolution";
  /** Whose digivolution cards are trashed (the selected permanent). */
  target: Target;
  /** How many source cards to trash (default 1). */
  amount?: number | "all";
  /** True => trash from the TOP of the digivolution stack (the default source form). */
  fromTop?: boolean;
  /** Position in the stack: "top" or "bottom". */
  position?: string;
  /**
   * "acrossDigimon": pool digivolution cards from ALL matching permanents and let the
   * controller pick `amount` cards from the combined pool (EX12-035 "any 4 digivolution
   * cards from your opponent's Digimon"). Default: single-target (first-resolved permanent).
   */
  scope?: "acrossDigimon";
  /**
   * True => the controller freely picks `amount` cards from the target permanent's whole
   * stack (RB1-016 "trash any 1 card under [permanent]", KB Q4094) instead of a deterministic
   * `fromTop`/`fromBottom` slice.
   */
  choose?: boolean;
}
export interface LinkAction extends ActionBase {
  kind: "Link";
  target: Target;
  /** Link-cost modifier from "with the cost reduced by N" (negative => cheaper). */
  costDelta?: number;
  /** When true, skip the link cost payment entirely ("without paying the cost"). */
  payCost?: boolean;
  /**
   * The friendly Digimon that RECEIVES the linked card ("link ... to 1 of your Digimon").
   * Absent => link onto the source permanent (the "to this Digimon" default). The
   * interpreter resolves it with a permanent prompt scoped to the controller's Digimon.
   */
  recipient?: Target;
  /** Link-material source zones ("from your hand or trash"). Default ["hand","digivolutionCards"]. */
  from?: ZoneRef[];
}
/**
 * A recipient-scoped, continuous LINK-cost reduction (documented behavior `rule implementation` +
 * `UntilCalculateFixedCostEffect`, documented behavior). Installed on the source's own permanent
 * (the link RECIPIENT) while the [Your Turn] gate holds: when a card whose definition matches
 * `whenLinkingTrait` WOULD link to that recipient, its link cost is reduced by `amount`.
 *
 * Unlike `LinkAction.costDelta` (which only reduces a link the SOURCE card itself declares),
 * this grant reduces a link DECLARED BY ANY ACTOR onto the recipient — the cross-actor
 * WhenWouldLink broadening (subsumes BT25-045's deferred broadening). The reduction is read by
 * `runLink`/`linkCostOf` from the recipient's grant store; per KB BT25-089 Q6423 multiple
 * reductions do NOT stack on one link declaration (the read site caps to the largest single
 * grant), and the floored cost never goes below 0.
 */
export interface GrantLinkCostReductionAction extends ActionBase {
  kind: "GrantLinkCostReduction";
  /** The link recipient(s) the reduction is installed on (defaults to the source permanent). */
  target: Target;
  /** Magnitude of the reduction (positive => cheaper by this much; BT25-004 => 1). */
  amount: number;
  /** Trait tokens a WOULD-link card must carry for the reduction to apply (e.g. Social/Tool/Game). */
  whenLinkingTrait: string[];
  /** How long the grant is live ("[Your Turn]" continuous => untilYourTurnEnd / the static window). */
  duration: EffectDurationRef;
}
/**
 * "[All Turns] players can't ignore digivolution requirements" (documented behavior
 * `rule implementation`, documented behavior; KB Q1738-Q1743). A seat-level
 * continuous rule-modifier that SUPPRESSES other cards' "ignore digivolution requirements"
 * effects for BOTH players (Q1738). DNA/Burst and no-cost digivolves are unaffected (Q1739/Q1740);
 * adding digivolution info is unaffected (Q1743); ignoring PART of the requirements is blocked
 * (Q1741/Q1742). The flag is consulted by the digivolve-legality path's ignore-requirements hook
 * — when that hook does not yet exist in-engine, the flag is faithfully RECORDED (proven by a
 */
export interface CannotIgnoreDigivolutionRequirementsAction extends ActionBase {
  kind: "CannotIgnoreDigivolutionRequirements";
  /** Whose ignore-requirements effects are suppressed; BT8-059 affects "both" players (Q1738). */
  affects: "both";
  /** How long the rule is live ("[All Turns]" => the permanent/static continuous window). */
  duration: EffectDurationRef;
}
/**
 * ＜Mind Link＞ — place this Tamer as the bottom digivolution card of a chosen Digimon
 * `rule implementation(...).MindLink()`.
 */
export interface MindLinkAction extends ActionBase {
  kind: "MindLink";
  /** Digimon selection filter (controller mine, kind Digimon, name/trait predicates). */
  target: Target;
}
/** "Add this card to its owner's hand" (self), e.g. a security card returning to hand. */
export interface AddToHandSelfAction extends ActionBase {
  kind: "AddToHandSelf";
}
/** "Place this card in the battle area" (self), e.g. a security Digimon entering play. */
export interface PlaceInBattleAreaSelfAction extends ActionBase {
  kind: "PlaceInBattleAreaSelf";
  /** Zone to place the card from/to. */
  zone?: string;
  /** Target specification (alternative to self). */
  target?: Target;
}
/** "Trash the top N cards of your deck" (self-mill). */
export interface TrashTopDeckAction extends ActionBase {
  kind: "TrashTopDeck";
  controller: Controller | "both";
  amount: number;
  /** Permit choosing any amount between `minimum` and `amount`. */
  upTo?: boolean;
  /** Minimum amount that must be trashed when `upTo` permits choosing the amount. */
  minimum?: number;
  /** Target specification (alternative to controller+amount). */
  target?: Target;
  /** Number of cards from the top. */
  topCount?: number;
  /** Store the number actually trashed for a later result condition. */
  trackCount?: string;
}
/** "Activate this card's [Main] effect" — a security clause that runs the main ability. */
export interface ActivateMainAction extends ActionBase {
  kind: "ActivateMain";
  /** Target to activate the [Main] effect of. */
  target?: Target;
  /** Number of effects to activate. */
  count?: number;
}

/** "Change the attack target to <target>" — redirect the current attack. */
export interface RedirectAttackAction extends ActionBase {
  kind: "RedirectAttack";
  /** The new attack target (a Digimon to be attacked instead). */
  target: Target;
  /**
   * Who chooses the new target. `"controller"` (the DEFAULT, and the only behavior the
   * existing RedirectAttack cards rely on) means the source card's controller picks.
   * `"opponent"` means the DEFENDING/attacked player chooses (BT4-075: "[When Attacking]
   * your opponent may choose 1 of their unsuspended Digimon ... switch the attack target
   * to it"). Absent => `"controller"`, so existing cards do not change behavior.
   */
  chooser?: "controller" | "opponent";
  /**
   * true` select), and on decline the attack proceeds unchanged. Absent => mandatory.
   */
  optional?: boolean;
  /** Mode: "mustAttack" => the target must attack. */
  mode?: string;
  /** Controller whose Digimon does the redirecting. */
  controller?: Controller;
}

/**
 * Select a permanent purely to BIND it under a handle for a later action to reference
 * ("Choose 1 of your [Shoutmon] Digimon. Delete 1 of your opponent's Digimon with DP equal
 * to or less than the chosen Digimon"). The first `Mode.Custom` select captures the chosen
 * permanent (`selectedPermanent = permanent`) without acting on it; a downstream action's
 * `Filter.relativeTo` / `PlaceUnder.underSelectionRef` reads the binding. The interpreter
 * resolves `target` (prompting the controller), stores the chosen permanentId under
 * `target.bindAs`, and performs no other effect. When nothing can be chosen the binding is
 * left empty and dependents that require it do not resolve.
 */
export interface SelectBindAction extends ActionBase {
  kind: "SelectBind";
  target: Target;
  /** Which player makes the binding choice; defaults to the effect controller. */
  chooser?: "controller" | "opponent";
}

// ---------------------------------------------------------------------------
// Continuous / restriction / static-grant actions (#2 bucket)
// ---------------------------------------------------------------------------

/** What a continuous restriction forbids the target from doing. */
export type RestrictionKind =
  | "attack" // "can't attack"
  | "attackPlayers" // "can't attack players"
  | "cantAttackDigimon" // "can't attack Digimon" (players remain legal targets)
  | "block" // "can't block"
  | "cantBeBlocked" // "can't be blocked" (GainCanNotBlockPlayerEffect) — restriction on the ATTACKER
  | "suspend" // "can't suspend"
  | "unsuspend" // "doesn't unsuspend"
  | "beDeletedInBattle" // "can't be deleted in battle"
  | "beDeleted" // "can't be deleted"
  | "beTrashed"
  | "beReturned" // "can't be returned to hand/deck"
  | "digivolve" // "can't digivolve"
  | "digivolveToLevel7" // "can't digivolve to level 7" (EX3-069, including DNA digivolution)
  | "digivolveExceptInto" // POSITIVE constraint: "this Digimon can only digivolve into [X]" (EX10-035; carries an into-filter, recorded via RestrictDigivolveInto and read by digivolve-legality)
  | "attackTargetChange" // "attack target can't change"
  | "cantBeAttacked" // "can't be attacked" (GainCanNotBeAttacked) — restriction on the DEFENDER
  | "dpImmune"
  | "beAffected" // "unaffected by your opponent's effects" (DigimonEffectImmunity / CanNotAffected)
  | "cantBeDeDigivolved"
  | "cannotActivateWhenDigivolving" // "can't activate [When Digivolving] effects" (BT19-038 KB Q5541–Q5545)
  // DEPRECATED — inert. The two distinct "can't activate effects" mechanics are now their own
  // actions (DisableSecurityEffectAction / DisableTimingEffectAction). Still emitted by the older
  // runtime record output for ~32 cards pending re-classification; left in the union so those records
  // type-check. No engine site consults it (it never had a consumer).
  | "activateEffects";

/**
 * A continuous "can't ..." restriction applied to a target while the effect is
 * active. The engine records it in the continuous-effect layer; combat/turn code
 * reads it.
 */
export interface RestrictAction extends ActionBase {
  kind: "Restrict";
  target: Target;
  /** What the target is restricted from doing. */
  restriction: RestrictionKind | string;
  /** The permanent the restriction is ON (defaults to the restriction's source). */
  on?: Target;
  duration: EffectDurationRef;
  /**
   * When set, a `beAffected` immunity blocks ONLY effects whose source card is
   * one of these kinds (e.g. `["Digimon"]` for "opponent's Digimon effects don't
   * affect this Digimon"). Absent means block regardless of source (default behavior).
   */
  fromSourceKind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /**
   * When true, the prohibition applies only while the restricted permanent's OPPONENT
   * controls the resolving effect — the "…by your opponent's effects" wording. Absent
   * means the prohibition applies to any effect ("effects can't delete or trash it").
   */
  byOpponentEffectsOnly?: boolean;
}

/**
 * Seat-level, state-sensitive digivolution prohibition: while active, the restricted player's
 * unsuspended Digimon can't digivolve. Suspended Digimon remain legal, as do Tamers that use a
 * direct named Tamer digivolution requirement; a Tamer used "as if it were a Digimon" is blocked.
 * EX3-053 Metallicdramon, Q3420-Q3422.
 */
export interface RestrictUnsuspendedDigivolveAction extends ActionBase {
  kind: "RestrictUnsuspendedDigivolve";
  seat: Controller;
  duration: EffectDurationRef;
}

/**
 * Positive digivolve-target constraint (EX10-035 "[All Turns] This Digimon can only digivolve
 * `digivolveExceptInto` restriction on the target carrying the ALLOWED into-filter; the
 * digivolve-legality check rejects a digivolve onto the restricted permanent unless the evolving
 * card matches `into`. Distinct from the plain `digivolve` ("can't digivolve at all") restriction.
 */
export interface RestrictDigivolveIntoAction extends ActionBase {
  kind: "RestrictDigivolveInto";
  /** The permanent(s) whose digivolve target is constrained (usually the source). */
  target: Target;
  /** The ONLY card(s) this permanent may digivolve into (matched against the evolving card). */
  into: Filter;
  duration: EffectDurationRef;
}

/**
 * Continuous "can't have less than N DP" floor (EX11-070's [All Turns] inherited
 * layer AFTER all +/- changes are summed (KB EX11-070 Q5941: original 5000 +2000 −7000 →
 * clamped to 1000, NOT a per-change clamp), distinct from a `ModifyDP` delta. Records a
 * floor on the target permanent; `recomputeDP`/`rawDp` raise the computed DP up to the
 * highest active floor. Cleared and re-derived each continuous-recompute pass (CR-01).
 */
export interface MinDpFloorAction extends ActionBase {
  kind: "MinDpFloor";
  /** The permanent(s) the floor applies to (the host of an inherited effect). */
  target: Target;
  /** The minimum DP the target may have (EX11-070 → 1000). */
  floor: number;
  duration: EffectDurationRef;
}

/**
 * Continuous "this Digimon's stacked cards can't be trashed by your opponent's effects"
 * KB Q5943). Prevents the OPPONENT's effects from trashing the target's stacked digivolution
 * cards (TrashDigivolution and `<De-Digivolve>`). The controller's OWN effects are unaffected
 *. Recorded on the target permanent and consulted by
 * the digivolution-card trash sites; cleared and re-derived each continuous pass (CR-01).
 */
export interface StackTrashLockAction extends ActionBase {
  kind: "StackTrashLock";
  /** The permanent whose stacked cards are protected (the host of an inherited effect). */
  target: Target;
  duration: EffectDurationRef;
}

/**
 * Install a delayed self-delete on the permanent THIS effect just played (EX10-035 "[Hand][Main]
 * Binds the just-played permanent's id (the 08-01 played-id result binding) and, via the Phase-7
 * timed-trigger surface, deletes it at the owner's turn end (the `endOfTurn` SubTrigger fired
 * co-located with OnEndTurn), then expires.
 */
export interface DelayedDeletePlayedAction extends ActionBase {
  kind: "DelayedDeletePlayed";
}
export interface DelayedDeleteAction extends ActionBase {
  kind: "DelayedDelete";
  target?: Target;
}

/**
 * Positive attack-legality grant: the target Digimon MAY also attack the opponent's
 * UNSUSPENDED Digimon while active (rule implementation, e.g. ST12-08
 * "This Digimon may also attack your opponent's unsuspended Digimon for the turn"). The
 * base rule allows attacking only a suspended defender; this relaxes it for the target.
 */
export interface GrantCanAttackUnsuspendedAction extends ActionBase {
  kind: "GrantCanAttackUnsuspended";
  target: Target;
  duration: EffectDurationRef;
  /**
   * When true, the grant only relaxes the suspension requirement for opponent Digimon that
   * have NO digivolution cards under them (documented behavior DefenderCondition `defender.HasNoDigivolutionCards`,
   * e.g. EX1-016/EX1-020/BT7-095 "...unsuspended Digimon with no digivolution cards"). Omitted/false
   * = any unsuspended opponent Digimon (ST12-08/P-058 "...unsuspended Digimon").
   */
  noDigivolutionCards?: boolean;
}

export interface GrantVortexCanAttackPlayersAction extends ActionBase {
  kind: "GrantVortexCanAttackPlayers";
  target: Target;
  duration: EffectDurationRef;
}

/**
 * "End that attack" (AttackProcess.EndAttack, e.g. BT23-069): transition the current
 * attack straight to the end-of-attack timing. A no-op when no attack is resolving. The
 * attacking Digimon is NOT affected — this changes the TIMING, not the Digimon (KB
 * BT23-069 Q5339/Q5340), so it ends even an effect-immune attacker's attack.
 */
export interface EndAttackAction extends ActionBase {
  kind: "EndAttack";
}

/**
 * Arm the "suspend-restriction-with-superlative-exception" (BT23-024): "other than their
 * highest play cost Digimon, none of your opponent's Digimon can suspend until their turn
 * ends." This is NOT a plain per-target Restrict — the EXEMPT set (the highest-play-cost
 * opponent Digimon) is RECOMPUTED each continuous pass as the board changes (KB BT23-024
 * Q5250/Q5252; Q6025/Q6026: if none has a play cost, ALL are restricted). The action arms a
 * duration-scoped source marker (default UntilOpponentTurnEnd, "until their turn ends"); the
 * continuous-recompute pass re-derives the affected opponent set from the live board and
 * records the per-target `suspend` restriction each pass. The consume-site is
 * combat/legality.canAttackerDeclare (a Digimon that can't suspend can't declare a tapping
 * attack).
 */
export interface ArmSuspendRestrictionAction extends ActionBase {
  kind: "ArmSuspendRestriction";
  /** Duration the arming holds (default "untilOpponentTurnEnd" — "until their turn ends"). */
  duration?: EffectDurationRef;
}

export interface SecurityAttackInvertAction extends ActionBase {
  kind: "SecurityAttackInvert";
  /** The permanent(s) whose existing ＜Security Attack ±N＞ grants have their sign inverted. */
  target: Target;
  duration: EffectDurationRef;
}

/**
 * Seat-level memory gain lock (rule implementation): the affected seat may not
 * gain memory from non-Tamer effects while active.
 */
export interface RestrictMemoryGainAction extends ActionBase {
  kind: "RestrictMemoryGain";
  /** Whose memory gain is restricted (from the source card owner's perspective). */
  seat: Controller;
  exceptTamerEffects: true;
  duration: EffectDurationRef;
}

/**
 * Seat-level prohibition on reducing play or digivolve costs (rule implementation).
 */
export interface RestrictCostReductionAction extends ActionBase {
  kind: "RestrictCostReduction";
  seat: Controller;
  costType: "play" | "digivolve" | "all";
  duration: EffectDurationRef;
}

/**
 * Seat-level prohibition on PLAYING / MOVING cards matching a filter (rule implementation /
 * rule implementation / rule implementation). "Your opponent can't use Option cards" /
 * "your opponent can't play or move Digimon with 6000 DP or less". The restriction
 * affects only the RESTRICTED seat's OWN actions/effects — a card matching the filter
 * cannot be played/moved by an action or an effect attributed to that seat; the SOURCE
 * player's effects may still play such a card into the restricted seat's area (KB
 * EX7-014 Q4675/Q4676). Token plays are EXEMPT (Q3834); breeding-area plays and
 * effect-driven moves ARE blocked (Q3835/Q6509). Delay/Security activations of Option
 * cards already in play are NOT "playing" and are unaffected (BT8-057 Q1736/Q1737,
 * EX1-072 Q3265/Q3266). Recorded on the continuous play-prohibition ledger and consulted
 * by play-card / breeding-move legality and effect-driven plays.
 */
export interface RestrictPlayAction extends ActionBase {
  kind: "RestrictPlay";
  /** Whose plays/moves are restricted (from the source card owner's perspective). */
  seat: Controller;
  /** Which cards the prohibition matches (kind Option; or kind Digimon + dpAtMost). */
  filter: Filter;
  /** "play" (rule implementation/rule implementation), "move" (rule implementation), or both. */
  mode: "play" | "move" | "playOrMove";
  /**
   * When true, the prohibition applies only to effect-driven plays (not normal hand play).
   * Consulted at the effect-play gate; bypassed by the normal play-card action gate.
   * Confirmed by KB Q&A Q4665–Q4668 and Q6245 (BT20-020).
   */
  byEffectOnly?: boolean;
  duration: EffectDurationRef;
}

/** Seat-wide prohibition on adding cards to security through one player's effects. */
export interface GlobalRestrictAction extends ActionBase {
  kind: "GlobalRestrict";
  restriction: "opponentCannotAddToSecurity";
  duration: EffectDurationRef;
}

/**
 * Suppress the [Security] effect of a flipped security card while the SOURCE permanent
 * `cardEffect.IsSecurityEffect` and `AttackingPermanent == self`). `target` resolves to
 * the ATTACKING permanent the disable is attached to (normally the source itself, NOT
 * the opponent) — when that permanent is the attacker, a revealed security card's
 * [Security] effect does not activate (the card is still trashed per KB Q886).
 * `sourceKind` distinguishes the Option-only form (BT1-025: suppress only Option
 * security effects) from the any-source form (EX6-010/EX3-073: suppress any security
 * effect). Recorded on the continuous security-effect-disable ledger and consulted in
 * the security-check resolution loop. This is the security half of the source
 * "can't activate effects" split (the timing half is `DisableTimingEffect`).
 */
export interface DisableSecurityEffectAction extends ActionBase {
  kind: "DisableSecurityEffect";
  /** The attacking permanent the disable is attached to (defaults to the source/self). */
  target: Target;
  /** "option" suppresses only Option security effects; "any" suppresses any. */
  sourceKind: "option" | "any";
  duration: EffectDurationRef;
}

/** The timing windows a `DisableTimingEffect` can suppress on a target permanent. */
export type DisableTiming = "whenDigivolving" | "whenAttacking" | "onPlay";

/**
 * Suppress a TARGET permanent's [When Digivolving] / [When Attacking] / [On Play]
 * on `cardEffect.IsWhenDigivolving | IsWhenAttacking | IsOnPlay`, honoring the
 * `!TopCard.CanNotBeAffected(invalidationClass)` effect-immunity gate). `target`
 * resolves to the suppressed permanents (usually the opponent's Digimon); `timings`
 * is which timing windows are masked. Recorded on the continuous timing-effect-disable
 * ledger and consulted by the per-effect activation gate so a masked effect does not
 * fire — unless the source permanent carries the `beAffected` immunity. This is the
 * timing half of the source "can't activate effects" split (the security half is
 * `DisableSecurityEffect`).
 */
export interface DisableTimingEffectAction extends ActionBase {
  kind: "DisableTimingEffect";
  /** The permanents whose timing effects are suppressed. */
  target: Target;
  /** Which timing windows are masked. */
  timings: DisableTiming[];
  duration: EffectDurationRef;
}

/** Declare the controller (or opponent) wins the game (effect win condition). */
export interface WinGameAction extends ActionBase {
  kind: "WinGame";
  /** Who wins relative to the source card's owner. */
  winner: "controller" | "opponent";
}

/** Re-run one of this card's other timing effects (meta-effect reactivation). */
export interface ReactivateEffectAction extends ActionBase {
  kind: "ReactivateEffect";
  /** Trigger window to copy from this same card (e.g. WhenDigivolving). */
  fromTrigger: EffectTrigger;
  count: number;
}

/**
 * "Activate 1 [On Play] / [When Digivolving] effect of ANOTHER card as an effect of
 * this Digimon" — the activate-FOREIGN-effect family (BT23-060 borrows a face-up
 * [Zaxon] security card's [On Play]; BT24-102 borrows an [Olympos XII] Digimon's
 * [On Play]/[When Digivolving]; EX8-054 borrows a [Justimon] digivolution card's
 * [When Digivolving]). Distinct from `ReactivateEffect`, which re-runs the SOURCE's
 * OWN effect: here the borrowed effect comes from a NAMED OTHER card the controller
 * chooses, but runs under the ACTIVATING card's control/timing (source
 * `selectedEffect.SetIsDigimonEffect(true)` + the activating card's hashtable). The
 * engine fetches the foreign card's compiled effects server-side; the client only
 * picks which eligible card — it cannot inject an arbitrary effect (threat T-04-14).
 */
export interface ActivateForeignEffectAction extends ActionBase {
  kind: "ActivateForeignEffect";
  /**
   * Where the foreign card sits relative to the activating card:
   *   - "security": a face-up card in the controller's security stack (BT23-060).
   *   - "digivolutionCards": a card in the activating Digimon's own digivolution
   *     stack (EX8-054).
   *   - "battleArea": a battle-area permanent's top card the controller owns (BT24-102).
   */
  zone: "security" | "digivolutionCards" | "battleArea";
  /** Which trigger windows are borrowable (e.g. ["OnPlay"] or ["OnPlay","WhenDigivolving"]). */
  fromTriggers: EffectTrigger[];
  /** Filter the eligible foreign cards (trait/name brackets, kind, controller). */
  filter: Filter;
  /** How many foreign effects to activate; default 1. */
  count: number;
  /** Restrict the lender to the card most recently placed under this Digimon. */
  lastPlacedOnly?: boolean;
  /** Run the borrowed effect with the chosen battle-area card as its own source. */
  useLenderAsSource?: boolean;
}

/**
 * Legacy prose-compiler shape for "activate 1 [On Play]/[When Digivolving] effect" clauses.
 * New authored IR should prefer `ActivateForeignEffect` or `ReactivateEffect`, but the catalog
 * still contains this older payload. The interpreter normalizes it through the same
 * server-authoritative borrowed-effect path when the payload is specific enough.
 */
export interface ActivateEffectAction extends ActionBase {
  kind: "ActivateEffect";
  target?: Target;
  effectType?: EffectTrigger | string;
  count?: number;
  asEffectOf?: string;
  /** Restrict the lender to the card most recently placed under this Digimon. */
  lastPlacedOnly?: boolean;
  /** Run the borrowed effect with the chosen battle-area card as its own source. */
  useLenderAsSource?: boolean;
}

/**
 * "Use 1 [Option] card from your hand without paying the cost" — the use-option-without-cost
 * family (EX8-037 / BT15-092 / BT16-094 / BT19-040). Distinct from `PlayWithoutCost` (which
 * plays a PERMANENT card and leaves it in play): an Option resolves its [Main] effect then goes
 * to trash (the `playInstances` `isPermanentKind` gap). Server-authoritative — the engine
 * enumerates the eligible Options (single-color, not under a CanNotPlayThisOption restriction),
 * prompts the controller to pick WHICH one, fetches that Option's compiled [Main] effect via
 * `getCompiledCard`, and runs it under the USING card's control/timing (`ctx.source` unchanged).
 * The client never supplies the effect body, only the choice (threat T-08-10/11).
 * The use RESULT binds on `ctx.lastOptionUsed` (KB EX8-037 Q4738 — bound at use-time even if the
 * Option's effect digivolves the using card away), so an `ifThisEffectUsed` tail can gate on it.
 *
 * `payCost: false` — free use (EX8-037 / most uses).
 * `payCost: true` + `reduceCostBy: N` — "with the cost reduced by N" (BT17-035 / EX12 family):
 *   the player pays `max(0, printed_cost − N)` memory; the cost cap for eligible options is
 *   `filter.playCostLte` when declared, otherwise the historical default of 5 (EX8-037).
 */
export interface UseOptionWithoutCostAction extends ActionBase {
  kind: "UseOptionWithoutCost";
  /** Eligible-Option filter (kind ["Option"] + any extra brackets); playCostLte sets the eligibility cap. */
  filter: Filter;
  /** false = free use; true = player pays the (reduced) cost. */
  payCost: boolean;
  /** Memory reduction applied to the printed cost when payCost is true (e.g. 2 = "cost reduced by 2"). */
  reduceCostBy?: number;
  /** Source zone(s); defaults to ["hand"] (the only printed form). */
  from?: ZoneRef[];
  /** Target specification (alternative to filter). */
  target?: Target;
}

/**
 * Legacy compiler shape for "activate this Option card's [Main] effect". This is intentionally
 * narrow: it resolves to `ActivateMain` for the current source rather than letting the client
 * provide an arbitrary effect body.
 */
export interface ActivateOptionMainAction extends ActionBase {
  kind: "ActivateOptionMain";
  target?: Target;
  count?: number;
}

/**
 * A static/aura effect with a DYNAMIC duration: it applies WHILE its `condition`
 * IsExistOnBattleArea, is implicit). The classic shape is "[Your Turn] While you
 * have a blue Tamer in play, this Digimon gains ＜Jamming＞" — modeled NOT as a
 * once-per-turn event with a permanent grant (which never expires when the
 * condition fails), but as an aura whose effect is live exactly while the gate is
 * true. `effect` is the single conferred behavior (a keyword grant, a DP modifier,
 * or a restriction); the continuous layer re-checks `condition` each evaluation.
 */
export interface AuraAction extends ActionBase {
  kind: "Aura";
  /** Whose / which permanents the aura affects (defaults to the source). */
  target: Target;
  /** The conferred continuous behavior. */
  effect:
    | { kind: "keyword"; keyword: KeywordRef }
    | { kind: "modifyDP"; amount: number }
    | { kind: "modifySecurityDP"; amount: number; seat?: "mine" | "opponent" }
    | { kind: "securityAttack"; amount: number }
    | { kind: "restriction"; restriction: RestrictionKind };
  /** The gate that must hold for the aura to be live (re-evaluated continuously). */
  while: Condition;
}

/**
 * A static name/trait grant ("also treated as [X]", "this Digimon gains all
 * effects of cards with [X] in their digivolution cards"). Resolved by the
 * continuous-effect layer against the card DB.
 */
export interface GrantStaticAction extends ActionBase {
  kind: "GrantStatic";
  target: Target;
  /**
   * "name"/"trait" => add an alias; "effects" => inherit effects of matching stack cards.
   * "immuneToOpponentOptionEffects" => the target Digimon is not affected by opponent Option
   * card effects for the duration (CAP-A8, BT19-089; stored as beAffected+fromSourceKind:Option).
   */
  grant: "name" | "nameForDigiXros" | "trait" | "effects" | "kinds" | "immuneToOpponentOptionEffects" | string;
  /** The granted tokens (from `[X]` refs) or the source filter for "effects". */
  tokens?: string[];
  filter?: Filter;
  /** Static effect specification (for object-shaped grants). */
  staticEffect?: { kind: string; [key: string]: unknown };
  /** Duration of the grant. */
  duration?: EffectDurationRef;
  /**
   * When true (or when `grant === "nameForDigiXros"`), the name alias is ONLY valid
   * during DigiXros material-slot matching. It must NOT appear in effectiveNames() or
   * any ordinary name filter (KB Q3068, Q3105, Q3119).
   */
  digiXrosOnly?: boolean;
}

/**
 * "You may use/play this card without meeting its color requirements" and the
 * "ignore this card's color requirements" family. A continuous permission on the
 * source (or a referenced card) — never a no-op once recorded.
 */
export interface WaiveColorRequirementAction extends ActionBase {
  kind: "WaiveColorRequirement";
  /** Whose color requirement is waived; defaults to the source card. */
  target?: Target;
  /** Color that's being waived (alternative specification). */
  color?: string;
  duration?: EffectDurationRef;
}

/**
 * "All of your opponent's Security Digimon get -N DP" — a DP modifier applied to
 * the Digimon cards in a security stack during a security check (the common
 * negative-DP-to-security shape). Modeled separately from ModifyDP because the
 * affected cards are not battle-area permanents.
 */
export interface ModifySecurityDPAction extends ActionBase {
  kind: "ModifySecurityDP";
  /** Whose security stack. */
  controller: Controller;
  amount: number; // signed
  duration: EffectDurationRef;
}

/**
 * "Add N to the maximum DP you can choose with DP-based deletion effects" — a continuous
 * `rule implementation` (read via `Player.MaxDP_DeleteEffect`). Per KB Q2721/Q2722
 * it raises a PRINTED numeric maximum (e.g. "4000 or less" -> "6000 or less") but NOT a
 * threshold that references a Digimon's DP. `scope` distinguishes the owner-wide form
 * (`EffectSourceCard.Owner == card.Owner`, raises any of the owner's DP-based deletions) from
 * the self form (`...PermanentOfThisCard() == card.PermanentOfThisCard()`, only this source
 * permanent's own deletions, i.e. "this Digimon's DP deletion effects' maximums"). Recorded
 * on the continuous DeletionMaxDp ledger and consumed by the Delete interpreter branch.
 */
export interface DeletionMaxDpModifierAction extends ActionBase {
  kind: "DeletionMaxDpModifier";
  /** Signed delta added to the deletion DP cap (positive => can delete higher-DP Digimon). */
  amount: number;
  /** "owner" => all the owner's DP-based deletions; "self" => only this source permanent's. */
  scope: "owner" | "self";
  duration: EffectDurationRef;
}

/**
 * A continuous immunity grant: the target cannot be chosen by and is unaffected by any
 * effect from the opponent while the condition holds. Stored as a `beAffected` restriction
 * on the continuous-effect layer (CAP-C-06, BT19-101).
 */
export interface GrantImmunityAction extends ActionBase {
  kind: "GrantImmunity";
  target: Target;
  /** Which effect category to block. "opponentEffects" = all opponent-controlled effects. */
  immuneFrom: "opponentEffects" | string;
  duration: EffectDurationRef;
}

/** Which cost a CostModifier changes. */
export type CostType =
  | "play" // the card's play cost (from hand/trash) — "Play Cost -N"
  | "digivolve" // a digivolution cost — "Digivolution Cost -N"
  | "use" // a Tamer/Option use cost (the generic "reduce the cost" form)
  | "dpDeletion" // legacy compiler label for owner-wide DP-deletion maximum modifiers
  | "playcost" // alternative name for play cost
  | "playCost"; // alternative name for play cost

export interface CostModifierAction extends ActionBase {
  kind: "CostModifier";
  /** Which cost is changed. */
  costType: CostType;
  /**
   * How `amount` is applied:
   *   - "delta" (default): a signed delta added to the cost (negative => cheaper).
   *     `int ChangeCost(){ Cost = <count()>; }` / `Cost = 0` form ("the cost IS equal
   *     to <count>" / "this card costs 0"). Per KB BT7-040 Q1568 the SET value is the
   *     base cost computed FIRST; other reduction effects then subtract from it, so the
   *     interpreter records it via the cost layer's `setFixed` (absolute) entry, which
   *     is applied before additive deltas. For the count-driven SET cards (BT7-040 /
   *     BT7-100) `scaling` carries the count (security stack) that produces `amount`.
   */
  mode?: "delta" | "set" | "raiseCeiling" | "reduce";
  /** Signed delta (mode "delta") or the absolute cost (mode "set") applied to the cost. */
  amount: number;
  /** Whose / which cards' cost is modified (defaults to the source card for the self form). */
  target: Target;
  /**
   * Optional constraint on the permanent being used as the digivolution base. This is
   * distinct from `target` for hand-resident effects: `target` identifies the card in hand
   * whose cost changes, while `sourceFilter` identifies what may evolve into it (BT3-031).
   */
  sourceFilter?: Filter;
  /** How long the modifier is live. */
  duration: EffectDurationRef;
  /**
   * `amount` then carries the per-unit literal and the multiplier is a runtime count.
   * (The runtime count comes from the inherited `scaling`; for mode "set" the resolved
   * count IS the absolute cost.)
   */
  scaled?: boolean;
  handResident?: boolean;
  /** Restriction kind (for cost modifiers that gate by restriction). */
  restriction?: string;
  /** True when the modifier is consumed by the next successful matching cost payment. */
  once?: boolean;
  /**
   * Actions to run when a `once` cost modifier is actually consumed by a successful cost
   * payment. The consuming permanent is bound under `consumeBindAs` for those actions.
   */
  onConsume?: Action[];
  /** Selection name used by `onConsume` actions to reference the permanent whose cost was modified. */
  consumeBindAs?: string;
  /**
   * Destination card filter for digivolve cost reduction (CAP-C-10). When present, the
   * reduction applies only when digivolving INTO a card matching this filter (the card
   * (BT2-088: source in battleArea + destination is a Tyrannomon-named card in hand).
   */
  into?: Filter;
}

// ---------------------------------------------------------------------------
// Security-stack manipulation (#4 bucket)
// ---------------------------------------------------------------------------

export type SecurityOp =
  | "shuffle" // "shuffle your security stack"
  | "trashTop" // "trash the top card of your opponent's security stack"
  | "trash" // alias for trashTop — "trash top security card" (BT18-101; semantically identical to trashTop)
  | "toHand" // "add your top/bottom security card to the hand"
  | "placeAsSecurity" // "place <X> as/on (top/bottom of) security stack"
  | "flipFaceUp" // "flip <controller>'s top face-down security card face up"
  | "addTop" // "add to the top of security"
  | "addBottom" // "add to the bottom of security"
  | "addTopOrBottom" // "add to the top or bottom of security"
  | "flipUp" // "flip face up"
  | "revealTop" // "reveal the top card of the security stack" (stays in security, face up)
  | "revealBottom" // "reveal the bottom card of the security stack"
  | "lookAndMayAddToHand"; // look at top security, optionally add it to hand, then run the matching branch (BT9-034)

export interface SecurityManipulationAction extends ActionBase {
  kind: "SecurityManipulation";
  op: SecurityOp;
  /** Whose security stack the op targets. */
  controller: Controller;
  /**
   * For effects where the affected player may choose whether to perform the security action
   * ("your opponent may trash their top security card" — BT19-094). This is intentionally
   * separate from ActionBase.optional, which always prompts the effect controller.
   */
  optionalFor?: Controller;
  /** True for "both players' security" — the op applies to each player's stack. */
  bothPlayers?: boolean;
  /** For trashTop: how many cards (default 1). */
  amount?: number;
  /** For trashTop: trash enough top cards to leave this many cards in the targeted security stack. */
  leaveCount?: number;
  /** For trashTop: controller chooses any amount from 0 through the computed maximum. */
  upTo?: boolean;
  /** For placeAsSecurity: which cards are placed. */
  source?: Target | "securityTop" | "deck" | "deckTop" | "revealed" | "reveal" | "rest" | "hand" | "handOrTrash";
  /** For placeAsSecurity: from which zone the placed cards come. */
  from?: ZoneRef[];
  /** For placeAsSecurity: top (default) or bottom of the stack. */
  toTop?: boolean;
  /** Position in the security stack: "top", "bottom". */
  position?: string;
  /**
   * For toHand: choose the card(s) from the whole security stack rather than taking top/bottom.
   * This models "look at your security stack, reveal 1 card, and add it to your hand" effects
   * such as BT1-087, where downstream branches need the exact moved card via `bindResultAs`.
   */
  chooseFromSecurity?: boolean;
  /** Restricts the selectable cards for `chooseFromSecurity` by their definitions. */
  selectionFilter?: Filter;
  /**
   * For placeAsSecurity ONLY: place the card(s) FACE UP in the security stack
   * (BT25-102's "place this card face up as the bottom security card"). A face-up
   * security card stays revealed to both players but otherwise behaves as normal
   * security (KB BT25-102 Q6484-6487); a shuffle re-hides it. Absent/false => the
   * normal face-down placement. Must NOT be set for non-security placements, so it
   * never enters the structural signature for ordinary placeAsSecurity matching.
   */
  faceUp?: boolean;
  /**
   * For placeAsSecurity: detach only the source permanent's current top card and promote the
   * top digivolution card, leaving the permanent in play. BT9-044 uses this as a deletion-
   * prevention cost. Requires at least 1 digivolution card.
   */
  detachPermanentTop?: boolean;
  /**
   * For addBottom/addTop: take the card from the TOP of the SOURCE permanent's digivolution
   * stack (the card directly beneath the top) and add it to the security stack, face-up when
   * `faceUp` is also set. BT20-055 "place the top card of this Digimon face-up at the bottom
   * of your security stack." The source permanent is resolved via `source.filter`. Absent/false
   * => the normal card-resolution path.
   */
  fromDigivolutionTop?: boolean;
  /**
   * After the trash/move op, store the set of affected card instance ids under this binding name.
   * A downstream action's `condition.bindingEmpty` checks if the binding is empty
   * (i.e. nothing was actually trashed — e.g. opponent had no security). BT18-101 EndOfAllTurns.
   */
  bindResultAs?: string;
  /** Store the number of security cards moved by this action for a later scaling action. */
  trackCount?: string;
  /** Actions to run after the looked-at security card is added to hand. */
  ifAddedToHand?: Action[];
  /** Actions to run when the controller leaves the looked-at card in security. */
  ifNotAddedToHand?: Action[];
  /**
   * A condition checked AFTER the action's cost is paid, gating only the security op itself —
   * distinct from `ActionBase.condition`, which is checked BEFORE the cost and would wrongly
   * block paying it. Models "By [cost], if [condition], ＜Recovery +N＞" where the cost is payable
   * regardless of the condition and the condition reads state that only holds true post-cost
   * (EX9-029 "if you have as many or fewer security cards as this Digimon has face-down
   * digivolution cards" — KB Q4783: you may still pay the cost even when the condition fails).
   */
  postCostCondition?: Condition;
}

/**
 * "By trashing the top security card of 1 player with the most security cards, ＜Recovery +N＞."
 * (ST23-05.) The controller may trash one eligible player's top security (a player whose security
 * count is > 0 and >= the other player's — choosing which when tied, KB Q6167) or decline; on a
 * trash, the source's owner gains ＜Recovery +N＞ (top N of their deck to the top of their security).
 */
export interface RecoverByTrashingMostSecurityAction extends ActionBase {
  kind: "RecoverByTrashingMostSecurity";
  /** ＜Recovery +N＞ (default 1). */
  amount?: number;
}

/**
 * "Trash the top N card(s) of <controller>'s security stack."
 * A standalone action (not a cost) that trashes from the specified player's security.
 * The optional `condition` gates whether the trash actually occurs (evaluated before trashing).
 * (CAP-E15, BT21-052 — trashes opponent's top security as part of a SubTrigger body.)
 */
export interface TrashSecurityTopAction extends ActionBase {
  kind: "trashSecurityTop";
  /** Whose security to trash from. */
  controller: Controller;
  /** How many cards to trash from the top (default 1). */
  count?: number;
}

// ---------------------------------------------------------------------------
// PlayPerLevel — per-level conditional play from zone (BT20-098)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// DNA digivolve / token (#4 bucket)
// ---------------------------------------------------------------------------

/**
 * One material slot in the W7-E-2 per-slot array form of `DnaDigivolveAction.materials`
 * (e.g. EX6-072: "1 of your level 6 Digimon [on the field] and 1 card in the hand").
 * Each slot resolves independently in its own named zone, unlike the single-`Target`
 * form which always searches the battle area / breeding area.
 */
export interface DnaDigivolveMaterialSlot {
  filter: Filter;
  zone: ZoneRef;
  count: number;
}

/** "DNA digivolve this Digimon and one of your other Digimon into [X]". */
export interface DnaDigivolveAction extends ActionBase {
  kind: "DnaDigivolve";
  /**
   * The two (or more) material Digimon. When `materials.includeRef` is set, one material slot is
   * pinned to a referenced permanent and the player chooses the remaining `count - 1` from the
   * filter (excluding the pinned id). If the pinned permanent cannot be resolved the DNA digivolve
   * is not legal.
   *
   * `"triggerSubject"` — the permanent that drove the enclosing trigger event
   * (TriggerInfo.subjectPermanentId / deletedPermanentId / attackerPermanentId).
   * Mirrors the existing `Target.sourceRef: "triggerSubject"` vocabulary.
   *
   * `"self"` — the source permanent ("this Digimon").
   *
   * Alternatively (W7-E-2), an array of `DnaDigivolveMaterialSlot`: one entry per material,
   * each resolved independently in its own `zone` (mixed-zone materials, e.g. one from the
   * field plus one from the hand). Every entry contributes exactly `count` materials; there
   * is no `includeRef`/`isSelf` support in this form.
   */
  materials: (Target & { includeRef?: "triggerSubject" | "self" }) | DnaDigivolveMaterialSlot[];
  /** Additional non-permanent material cards, e.g. a specific card in trash/hand. */
  looseMaterials?: Target & { from?: ZoneRef[] };
  /** The card DNA-digivolved into (filter on the result). */
  into?: Filter;
  payCost: boolean;
  /** Store the resulting permanent id under this name for downstream `filter.boundRef` use. */
  bindResultAs?: string;
}

/**
 * "1 of your Digimon may app fuse into a Digimon card in the trash/hand."
 *
 * App Fusion (the Appmon mechanic) plays a fusion-TARGET Digimon card from the trash or
 * hand ON TOP of an existing battle-area Digimon, carrying that Digimon's stack underneath
 * — the same placement as `digivolveFromInstance`, NOT DnaDigivolve (no material is consumed
 * fusion target's `CanAppFusionFromTargetPermanent`.
 *
 * Legality is owned by the TARGET card's `appFusionRequirement` (`AddAppfuseMethodByName` /
 * `IAddAppFusionConditionEffect`): the fusing permanent's top card plus its linked cards must
 * collectively cover at least two DISTINCT names from `appFusionRequirement.names`
 *. The paid cost is `appFusionRequirement.cost`.
 */
export interface AppFuseAction extends ActionBase {
  kind: "AppFuse";
  /** The fusing battle-area Digimon ("1 of your Digimon"). */
  source: Target;
  /** Filter on the fusion-result card (e.g. the [System]/[Life]/[Transmutation] trait gate). */
  into: Filter;
  /** Where the fusion-result card comes from ("trash" for BT24-087, "hand" for BT25-089). */
  from: ZoneRef[];
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

// ---------------------------------------------------------------------------
// Modal / sub-trigger / replacement (#1 bucket)
// ---------------------------------------------------------------------------

/** "Activate N of the effects below" — choose among the nested modal options. */
export interface ModalAction extends ActionBase {
  kind: "Modal";
  /** How many of the options to activate (fixed count). */
  choose: number;
  /**
   * Scales `choose` dynamically: "for every N of <unit>, activate 1 option".
   * `choose` is overridden by `floor(scaleFactor(chooseScaling))` at runtime.
   * Both may be set; `chooseScaling` wins when present.
   */
  chooseScaling?: Scaling;
  /** Activate every option instead when the live condition is met. */
  chooseAll?: { condition: Condition };
  /** Each option is an ordered action list. */
  options: Action[][];
  /** Player-facing labels aligned by index with `options`. */
  labels?: string[];
  /** Optional live availability gate for each option at decision time. */
  optionConditions?: Array<Condition | null>;
}

/** Execute exactly one ordered action list based on a live condition. */
export interface ConditionalBranchAction extends Omit<ActionBase, "condition"> {
  kind: "ConditionalBranch";
  condition: Condition;
  ifTrue: Action[];
  ifFalse?: Action[];
}

/**
 * A delayed / triggered sub-effect: "When X, <effect>". The `when` describes the
 * future event that arms the sub-effect; `actions` run when it fires. The engine's
 * sub-trigger subsystem subscribes these to the event bus.
 */
export type SubTriggerEvent =
  | "whenAttacking" // "When this Digimon attacks"
  | "whenAttackTargetSwitched" // "When attack targets change"
  | "whenOpponentAttacks" // "When one of your opponent's Digimon attacks"
  | "whenBlocked" // "When this Digimon is blocked"
  | "whenBlockerActivated" // one of your Digimon suspended to activate ＜Blocker＞
  | "whenSuspended" // "When this Digimon/Tamer suspends"
  | "whenUnsuspended" // "When this Digimon/Tamer becomes unsuspended"
  | "whenDeletesInBattle" // "When this Digimon deletes [an opponent's Digimon] in battle"
  | "whenOneOfYoursDigivolves" // "When one of your Digimon digivolves"
  | "onDeletionOf" // "When [a Digimon] is deleted"
  | "whenSecurityRemoved" // "When a card is removed from your/your opponent's security"
  | "whenAddSecurity" // "When cards are added to your/your opponent's security stack" (documented behavior EffectTiming.OnAddSecurity)
  | "onAddDigivolutionCards" // "When [Tamer] cards are placed in this Digimon's digivolution cards"
  | "whenPlayed" // "When [a Digimon matching sourceFilter] is played" / "When you play [X]"
  | "whenOptionPlayed" // "When an Option card is placed in the battle area" (option-permanent placement seam)
  | "whenLeavesPlay" // "When [this/a] Digimon leaves the battle area" (non-replacement reaction)
  | "whenLinked" // "When this Digimon gets linked" / "When a card is linked to this Digimon"
  | "whenLinkTrashed" // "When a link card is trashed (by an effect)" — a genuine trash, NOT a link-card replace (KB EX10-062 Q5172 / EX10-073 Q5188)
  | "whenDigivolutionTrashed" // "When a digivolution card is trashed by an effect" — a genuine effect-trash, NOT a return-to-hand bounce-clear (KB P-004 Q4113)
  | "whenOptionUsed" // "When you use an Option card's effect" (BT19-040 token watcher); the use verb lands in 08-06, the fire-hook seam is defined here
  | "onDigivolutionCardDiscarded" // "When a digivolution card is trashed by an effect" — individual-card trashed event (BT10-006, BT14-083)
  | "onDigivolutionCardsDiscardedBatch" // simultaneous exact-source reactions before discarded watchers are recomputed away
  | "onDigiBurstCardDiscarded" // simultaneous batch restricted to cards paid for a Digi-Burst cost
  | "onDigivolutionCardReturnToDeckBottom" // "When [a matching card] is placed from this Digimon's digivolution cards at the bottom of its owner's deck" (BT11-065)
  | "onDiscardLibrary" // "When a card in a player's deck is trashed" — library mill event (BT14-077)
  | "startOfYourMainPhase" // granted "[Start of Your Main Phase] ..." trigger fired at the watched permanent's owner's main-phase start (documented behavior EffectTiming.OnStartMainPhase)
  | "endOfTurn" // granted "[End of Your Turn] ..." trigger fired at the owner's turn end (documented behavior EffectTiming.OnEndTurn / UntilOwnerTurnEnd) — e.g. EX10-035's delayed self-delete
  | "whenTrashedFromDigivolutionCards" // "When this card is trashed from digivolution cards"
  | "whenEffectSuspends" // "When this Digimon is suspended by an effect"
  | "whenEffectTrashes" // "When a card is trashed by an effect"
  | "whenOpponentDraws" // "When your opponent draws a card"
  | "whenCardAddedToSecurity" // "When a card is added to security"
  | "opponentAddsSecurityToHand" // "When your opponent adds a security card to their hand"
  | "whenCardPlacedInDigivolution" // "When a card is placed in digivolution cards"
  | "whenMovedFromBreeding" // "When a Digimon moves from the breeding area"
  | "whenBattleWon" // "When this Digimon wins a battle"
  | "whenHandCardTrashed" // "When a card in your hand is trashed"
  | "whenHandTrashed" // "When your hand is trashed from" — fires once per trash ACTION (KB Q6400/Q6401), not per card
  | "whenTrashedFromSecurity" // "When a card is trashed from security"
  | "whenTrashedFromHand" // "When a card is trashed from your hand"
  | "whenEffectAddsToHand" // "When an effect adds a card to hand"
  | "whenEffectAddsToOpponentHand" // "When an effect adds cards to your opponent's hand" — ANY effect-driven hand addition (draw/return/reveal-add), NOT the normal draw-phase draw and NOT only the draw action (cf. whenOpponentDraws)
  | "whenDigimonWouldLeave" // "When one of your Millenniummon would leave the battle area" — ＜Delay＞ watcher event (BT19-099); aliases whenLeavesPlay at runtime
  | "wouldBeReturned" // "When [matching Digimon] WOULD BE returned to hand/deck" (BT20-074; CAP-C-11)
  | "whenTrashedByEffect" // "When [this card] is trashed by an effect while in the battle area" (BT19-093; CAP-E8)
  | "whenTrashedFromDeck" // "When this card is trashed from the deck" (BT19-097; CAP-H-01)
  | "whenCheckedFaceUpSecurity" // "When your Digimon checks a face-up security card" (BT20-055; CAP-H-03)
  | "raw";

export interface SubTriggerAction extends ActionBase {
  kind: "SubTrigger";
  event: SubTriggerEvent;
  /**
   * Keep this timed watcher at the activating-player scope instead of anchoring it to the
   * source permanent. This models resolved effects that continue to affect matching permanents
   * entering later even if the source leaves play (BT10-016 Q1945). Requires `duration` so the
   * retained activation context has an explicit expiry boundary.
   */
  playerScoped?: boolean;
  /** Which permanent the sub-trigger watches (defaults to the source). */
  on?: Target;
  /**
   * For onDeletionOf / onAddDigivolutionCards: which cards' event arms the trigger
   * ("your Tokens or Digimon with the [Puppet] trait is deleted", "Tamer cards are
   * placed"). When present, the engine fires the sub-effect only for a matching card.
   */
  sourceFilter?: Filter;
  /** Restrict the card whose effect produced the event (for example, "by [Rasenmon]'s effect"). */
  effectSourceFilter?: Filter;
  /**
   * Do not fire when this watcher card's own effect caused the deck trash.
   * Used by effects such as EX2-039 ("if it wasn't trashed by this card's effect").
   */
  excludeSelfEffect?: boolean;
  /**
   * An optional fire-TIME gate evaluated against the firing event's payload (TriggerInfo),
   * not a battle-area subject — for events whose gate is on the event data itself rather than
   * a triggering permanent. whenAddSecurity uses it for "your security" + the [Zaxon]/[Royal
   * Base] trait check on the just-added cards (BT23-083); the watcher body is skipped entirely
   * when it does not hold, so the body's mandatory tail never runs on an off-gate event. This
   * is the reusable fire-time predicate (RESEARCH Pattern: subtrigger fire-time condition).
   */
  fireCondition?: Condition;
  /**
   * Controller scope of the EFFECT that drove the event, for events that carry an acting-effect
   * seat (currently whenEffectSuspends). "mine" => only the watcher controller's OWN effect
   * `EffectSourceCard.Owner == card.Owner`). Absent => ANY effect's suspension fires it (BT10-004
   */
  bySourceController?: "mine" | "opponent";
  /** What runs when the sub-trigger fires. */
  actions: Action[];
  /**
   * Lifecycle of a GRANTED watcher installed on a chosen permanent ("until that owner's
   * (documented behavior): `untilOpponentTurnEnd` => the grant clears at the watched permanent's
   * owner's turn end. Absent => the watcher persists until its anchor leaves the field.
   */
  duration?: EffectDurationRef;
  /** Original prose for the trigger clause (diagnostics + unsupported routing). */
  raw: string;
  /** Internal text before recursive compilation. */
  _innerText?: string;
  /** Filter that must match the triggering card. */
  triggerFilter?: Filter;
  /**
   * When several permanents satisfy the watcher's event simultaneously (e.g. multiple matching
   * Digimon leave at once), the controller picks ONE to drive the body (BT19-099 ＜Delay＞:
   * the chosen leaving Digimon is the cost reference for `relativeToLeavingDigimon`). The
   * runtime already fires the watcher per-leaving-permanent, so this single-subject default
   * matches the field; explicit multi-leave disambiguation is a refinement.
   */
  pickOne?: boolean;
  /**
   * The sub-trigger fires at most once per trigger-timing window, even if multiple matching
   * events occur simultaneously (e.g. two same-named Digimon played via token creation).
   * KB Q2814 (BT2-053): "triggers only once even when multiple same-named Digimon are played."
   * Implemented by skipping subsequent fires that share the same `effectKey + timingId`.
   */
  oncePerTiming?: boolean;
  /** Stable effect key synthesized for a containing `[Once Per Turn]` continuous watcher. */
  oncePerTurnKey?: string;
  /**
   * One-shot watcher: it unsubscribes the first time it actually fires (its gates held and its
   * body ran), instead of persisting until its anchor leaves the field. This is the "at the NEXT
   * end of your opponent's turn" shape — EX3-069, whose KB Q5722 states the played Digimon is
   * deleted only at the FIRST opponent turn end after the play, so a Digimon that survives that
   * deletion is NOT deleted at the following opponent turns' ends.
   */
  once?: boolean;
}

/** What a replacement effect does instead of / before the replaced event. */
export type ReplacementEvent =
  | "wouldLeavePlay" // "When this Digimon would leave the battle area ..."
  | "wouldBeDeleted" // "When this Digimon would be deleted ..."
  | "wouldBePlayed" // "When this card would be played ..."
  | "wouldDigivolve" // "When this would digivolve ..."
  | "wouldLeaveBattleArea" // "When this Digimon would leave the battle area"
  | "raw";

export interface ReplacementAction extends ActionBase {
  kind: "Replacement";
  event: ReplacementEvent;
  on?: Target;
  /**
   * "reduceCost" => reduce play/digivolve cost; "prevent" => the event doesn't happen (by a
   * cost); "instead" => do `actions` instead. Optional: the prose compiler sometimes emits the
   * mode as a NESTED `{kind:"Prevent"}` or nested reduceCost `Replacement` inside `actions`
   * instead of setting it here (BT18-082, BT22-079, BT23-073) — `runReplacement` derives the
   * effective mode from those nested shapes when this is absent.
   */
  mode?: "reduceCost" | "increaseCost" | "prevent" | "instead";
  /** For reduceCost/increaseCost. */
  amount?: number;
  /**
   * Alternative reduceCost amounts the controller chooses BETWEEN — mutually exclusive,
   * never summed — for text that offers a base reduction plus a conditional larger
   * reduction "instead" (EX6-006: "reduce the play cost by 3 [...] reduce the play cost
   * by 4 instead" when a digivolution-card-name threshold is met; KB Q3700 confirms the
   * controller may still pick the smaller amount even when eligible for the larger one).
   * Each entry's own `condition` gates whether it is currently offered; when only one
   * entry is eligible it installs without a prompt, when none are eligible nothing
   * installs. Overrides a flat `amount` when present.
   */
  amountChoices?: { amount: number; condition?: Condition; raw?: string }[];
  /** Filter restricting which cards this replacement applies to ("when a Digimon would be played"). */
  sourceFilter?: Filter;
  /**
   * For a wouldDigivolve cost-reduction: the digivolution-RESULT filter the reduction
   * applies to ("when digivolving into a multicolored blue/red Digimon, reduce the cost
   */
  into?: Filter;
  /** What to do instead / as the replacement payload. */
  actions?: Action[];
  /**
   * For a "prevent" leave/delete replacement: which permanents the reaction protects ("when
   * THIS Digimon" => self; "when any of your [X] trait Digimon" => a filter). Absent => self.
   */
  target?: Target;
  /**
   * ("they don't leave") rather than one chosen permanent ("1 of those doesn't leave").
   */
  affectsAll?: boolean;
  /**
   * For "prevent": the qualifier on the removal cause the reaction watches. `byOpponentEffect`
   * = only the opponent's effects; `otherThanYourEffect` = anything except your own effects;
   * `byEffect` = any effect; `any` = any removal. The prevention's cost (ActionBase.cost) is
   * the gate the controller pays to prevent.
   */
  leaveCause?: "byOpponentEffect" | "otherThanYourEffect" | "byEffect" | "byBattle" | "otherThanBattle" | "any";
  /**
   * For "prevent": true when the protection is "can't LEAVE the battle area other than by
   * deletion" (documented behavior `rule implementation` "Can't leave battle area except by deletion effect",
   * EX6-044). A move/bounce/return is prevented, but a DELETION is NOT (KB EX6-044 Q3771: a
   * deletion still removes it). The consult passes whether the removal is a bounce; when
   * `exceptDeletion` is set, a NON-bounce removal (deletion) is allowed through (not prevented).
   * Absent => the prevent covers any matching leave (delete + bounce), per its `event`.
   */
  exceptDeletion?: boolean;
  /**
   * For ＜Digisorption＞ redirect (BT3-056 Tyranomon): when true and the mode is "reduceCost",
   * the Replacement's suspend cost is paid by the OPPONENT (opponent's Digimon are suspended),
   * ＜Digisorption＞ suspend cost from the controller's permanents to the opponent's. Absent =>
   * standard behavior (controller suspends their own Digimon).
   */
  digisorptionRedirect?: boolean;
  /**
   * Side effects that activate alongside this Replacement when its cost is paid. Each entry is an
   * `Action` that modifies the play environment for the current play event. Currently used only
   * for `AllowDigiXrosMaterialsFromTrash` (BT21-030): placing a [Shoutmon] under the card also
   * unlocks trash as a valid source zone for DigiXros materials.
   */
  additionalEffects?: Action[];
  /**
   * Dynamic ＜Delay＞ replacement gate. The replacement can only be used after the source has an
   * armed Delay keyword grant; using it consumes the grant and trashes the source before payload.
   */
  requiresDelayArmed?: true;
  raw: string;
}

/**
 * Legacy nested prevention payload emitted inside `Replacement.actions`, plus a small number of
 * direct prevention actions. Nested `Prevent` is normalized by `runReplacement`; direct `Prevent`
 * is interpreted as a conservative `wouldLeavePlay` prevention for the source.
 */
export interface PreventAction extends ActionBase {
  kind: "Prevent";
  mode?: "leavePlay" | "delete" | "battle" | string;
  target?: Target;
  affectsAll?: boolean;
  leaveCause?: ReplacementAction["leaveCause"];
}

/**
 * "When this card would be played, by [paying an OPTIONAL payment], reduce this card's play
 * cost by [a fixed amount | the sacrificed Digimon's play cost]." The pay-time interactive
 * cost-reduction family (EX9-043 optional-trash → −2; BT25-076 sacrifice → −[deleted cost]).
 *
 * This is fundamentally different from a passive `CostModifier` / `Replacement reduceCost`:
 *   1. It runs at PAY TIME, after cost calculation and before payment — the play action fires
 *      the in-hand card's `BeforePayCost` window, this action resolves SERVER-SIDE (the optional
 *      payment is executed by the engine, never trusted from the client), and the resulting
 *      delta is floored into the cost before memory is spent (T-08-26 / T-08-27).
 *   2. The delta can be DYNAMIC — for `deletedSacrificePlayCost` it equals the printed play cost
 *      of the Digimon the controller chose to delete (BT25-076), not a static/count-scaled value.
 *
 * The payment is OPTIONAL: when declined the delta is 0 and the full cost is
 * paid. The interpreter records the computed delta on `ctx.playCostDelta`; the play action reads
 * it. Authored via a hand-IR override (the runtime record does not emit this kind).
 */
export interface ReducePlayCostAction extends ActionBase {
  kind: "ReducePlayCost";
  /** The OPTIONAL payment that, when made, earns the reduction. */
  payment:
    | {
        /** "By trashing 1 [Cyborg]/[Ver.5] card from your hand" (EX9-043). */
        kind: "trashFromHand";
        /** Which hand cards are eligible to trash (the trait gate). */
        filter: Filter;
      }
    | {
        /** "By deleting 1 of your play-cost-≤11 [Negamon] Digimon" (BT25-076). */
        kind: "sacrificePermanent";
        /** Which of the controller's battle-area Digimon may be sacrificed. */
        target: Target;
      };
  /** How the cost delta is computed from the payment. */
  amount: { kind: "fixed"; value: number } | { kind: "deletedSacrificePlayCost" };
}

/**
 * The escape hatch. Carries the original residual prose for any clause (or
 * clause tail) the parser could not fully model. The interpreter routes this to
 * `unsupported(...)` so gaps are visible at runtime (never a silent no-op).
 */
export interface RawUnparsedAction {
  kind: "RawUnparsed";
  text: string;
  condition?: Condition;
  cost?: Cost;
  scaling?: Scaling;
  optional?: boolean;
}

export type Action =
  | DrawAction
  | GainMemoryAction
  | SetMemoryAction
  | SetTurnEndMemoryAction
  | DeleteAction
  | DeleteUntilCountAction
  | DeleteBudgetAction
  | RevealChooseDeleteBudgetAction
  | DeleteLevelBudgetAction
  | DeleteByDPBudgetAction
  | AddToDPDeleteBudgetAction
  | TrashAction
  | OpponentMayTrashSecurityAction
  | HandManipulationAction
  | ReturnAction
  | SuspendAction
  | RepeatPerCountAction
  | UnsuspendAction
  | MovePermanentAction
  | HatchAction
  | ModifyDPAction
  | AddDPFromSuspendedCostAction
  | SetBaseDPAction
  | GainKeywordAction
  | PlayWithoutCostAction
  | PlayMultipleAction
  | PlayFromZoneAction
  | GainTriggeredEffectAction
  | DelayedEffectAction
  | GrantAuraToOpponentsAction
  | DigiXrosMaterialZoneExpansionAction
  | AllowDigiXrosMaterialsFromTrashAction
  | RevealAddAction
  | RevealAction
  | SearchAction
  | SearchSecurityAction
  | DeDigivolveAction
  | DigivolveAction
  | AttackAction
  | BattleAction
  | PlaceUnderAction
  | TrashDigivolutionAction
  | LinkAction
  | GrantLinkCostReductionAction
  | CannotIgnoreDigivolutionRequirementsAction
  | MindLinkAction
  | AddToHandSelfAction
  | PlaceInBattleAreaSelfAction
  | TrashTopDeckAction
  | ActivateMainAction
  | RedirectAttackAction
  | SelectBindAction
  | RestrictAction
  | RestrictUnsuspendedDigivolveAction
  | GrantCanAttackUnsuspendedAction
  | GrantVortexCanAttackPlayersAction
  | EndAttackAction
  | ArmSuspendRestrictionAction
  | SecurityAttackInvertAction
  | RestrictDigivolveIntoAction
  | MinDpFloorAction
  | StackTrashLockAction
  | DelayedDeletePlayedAction
  | DelayedDeleteAction
  | AuraAction
  | GrantStaticAction
  | GrantImmunityAction
  | WaiveColorRequirementAction
  | ModifySecurityDPAction
  | DeletionMaxDpModifierAction
  | CostModifierAction
  | SecurityManipulationAction
  | RecoverByTrashingMostSecurityAction
  | TrashSecurityTopAction
  | PlayPerLevelAction
  | DnaDigivolveAction
  | AppFuseAction
  | PlayTokenAction
  | ModalAction
  | ConditionalBranchAction
  | SubTriggerAction
  | ReplacementAction
  | RestrictMemoryGainAction
  | RestrictCostReductionAction
  | RestrictPlayAction
  | GlobalRestrictAction
  | DisableSecurityEffectAction
  | DisableTimingEffectAction
  | WinGameAction
  | ReactivateEffectAction
  | ActivateEffectAction
  | ActivateForeignEffectAction
  | ActivateOptionMainAction
  | UseOptionWithoutCostAction
  | ReducePlayCostAction
  | PreventAction
  | RawUnparsedAction;

export type ActionKind = Action["kind"];

// ---------------------------------------------------------------------------
// CardEffect (the per-clause-group unit) and the per-card compiled record
// ---------------------------------------------------------------------------

/**
 * One trigger window's worth of behavior: a trigger (+ optional modifiers) and
 * an ordered list of actions (the prose clauses, including any `Then, ...`
 * sequencing, flattened in order). A card compiles to `CardEffect[]`.
 */
export interface CardEffect {
  trigger: EffectTrigger;
  /** Exact printed clause for decision/log provenance; falls back to a structural summary. */
  description?: string;
  /** True when this effect comes from the inheritedEffectText field (ESS). */
  isInherited?: boolean;
  /** True when this effect comes from the securityEffectText field. */
  isSecurity?: boolean;
  /**
   * Deferral window for a [Security] effect whose printed text delays resolution ("At the
   * end of the battle, ...", EX8-035). NOT YET CONSUMED by the interpreter — such effects
   * currently resolve at security-check time; the annotation preserves the printed intent
   * until the deferred-security capability lands.
   */
  timing?: "endOfBattle";
  /**
   * True when this is a `{Breeding}` effect — it triggers/activates ONLY while its card is in the
   * breeding (raising) area. Combined with a timing
   * trigger (e.g. StartOfYourMainPhase), the timing's turn-owner gate still applies, but the
   * base "still-relevant" guard becomes "in breeding" instead of "on the battle area" — so a
   * breeding-resident timed effect (BT22-007 {Breeding}[Start of Your Main Phase]) fires while in
   * breeding, and a battle-area copy does NOT (KB BT22-007 Q4855).
   */
  isBreeding?: boolean;
  /**
   * True when a `[Trash]` tag appears alongside a timing trigger in the same block. The effect
   * activates only when this card is in the trash.
   */
  isFromTrash?: boolean;
  /**
   * True when a `[Hand]` tag appears alongside a timing trigger in the same block. The effect
   * activates only when this card is in the hand.
   */
  isFromHand?: boolean;
  frequency?: EffectFrequency;
  /**
   * Optional turn-owner gate for effects whose trigger does not encode the turn direction
   * ("yourTurn" / "opponentsTurn"). Used by `whenTrashedFromBattleArea` effects on BT19-095
   * to split the two variants (same trigger, different turn; KB Q3170). The interpreter
   * evaluates this in `runEffect` against the current turn seat.
   */
  turnCondition?: "yourTurn" | "opponentsTurn";
  /**
   * Optional shared once-per-turn key. When set, this effect's per-turn use ledger is keyed on
   * `${cardId}/${sharedUseKey}` instead of the default `ir-<timing>-<index>` — so several clauses
   * across DIFFERENT timings (e.g. an On Play / When Digivolving / When Attacking that "[Once Per
   * all count against a single per-turn limit on the same physical card instance.
   */
  sharedUseKey?: string;
  /** Whole-effect "You may". */
  optional?: boolean;
  /** Whole-effect gate ("If ..." / "While ..." leading the clause). */
  condition?: Condition;
  /** Keyword abilities declared at this window (e.g. ＜Blocker＞ before the prose). */
  keywords?: KeywordRef[];
  /** The ordered actions. */
  actions: Action[];
}

/** Coverage classification of one card's parse. */
export type Coverage = "full" | "partial" | "none";

export interface DigivolutionRequirement {
  /** Required level of the card digivolved FROM, when stated ("Lv.5" / "from Lv.3"). */
  level?: number;
  /** Maximum level when the documented behavior uses `.Level <= N` on the source. */
  levelMax?: number;
  /** Minimum level when the documented behavior uses `.Level >= N` on the source. */
  levelMin?: number;
  /** Required name tokens on the source ("w/[Terriermon]/[Lopmon] in name") — SUBSTRING match. */
  names?: string[];
  /**
   * Required EXACT source card names — the base's printed name must EQUAL one of these (documented behavior
   * `CardNames.Contains("Veemon")`, exact name-list membership). Used by "digivolve from
   * [ExactCard]" paths (Armor / X-Antibody / Blast digivolve) where a substring `names` match
   * would wrongly accept relatives ("Veemon" ⊂ "ExVeemon", "Garurumon" ⊂ "WereGarurumon").
   */
  namesExact?: string[];
  /** Required trait tokens on the source ("w/[Xros Heart] in traits" / "[DS] trait"). */
  traits?: string[];
  /**
   * Trait tokens the source must NOT have — "digivolve ... from a Digimon WITHOUT the [X Antibody]
   * trait" (EX8-037). A base carrying ANY listed trait is excluded from this alternate path.
   */
  excludeTraits?: string[];
  /** Text tokens the source must contain ("w/[Pulsemon] in text"). */
  texts?: string[];
  /** The digivolve cost paid. */
  cost: number;
  /** True for an alternate `[Digivolve] ...` path (vs the primary printed requirement). */
  isAlternate: boolean;
  /**
   * The base permanent digivolved ONTO must be a Tamer.
   * Used by alternate paths that "digivolve onto one of your Tamers as if the Tamer is a
   * level N Digimon" (BT7-112). A normal level/trait/name-gated requirement leaves this unset.
   */
  baseIsTamer?: boolean;
  /**
   * Required color(s) of the base card (for Tamer-onto paths that restrict the Tamer's color,
   * e.g. "onto one of your black Tamers"). At least ONE of the listed colors must appear in the
   * base's color set. Omitted when no color gate applies.
   */
  baseColors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /**
   * Required printed play cost of the base card ("[Digivolve] Play cost 12 [Ceresmon]: Cost 2",
   * BT26-032) — distinguishes same-name reprints that differ only by play cost (three "Ceresmon"
   * cards share a name; only the play-cost-12 prints qualify). Paired with `names`/`namesExact`
   * rather than used alone.
   */
  basePlayCost?: number;
  /**
   * A NON-MEMORY enabling cost paid in addition to `cost`: place `count` cards matching the
   * predicate (kind ∈ `kinds` OR a trait ∈ `traits`) from the listed `from` zones at the
   * BOTTOM of the owner's deck (documented behavior BT7-112 "by placing 10 Tamer/[Hybrid] cards … at the
   * bottom of your deck"). The requirement is only available, and the digivolve only legal,
   * when at least `count` matching cards exist across `from`.
   */
  placementCost?: {
    count: number;
    from: ("hand" | "trash")[];
    kinds?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
    traits?: string[];
  };
  /**
   * Digivolution-stack gate on the BASE permanent: it must already have at least
   * `minTraitStackCount` cards UNDER it whose traits include one of `minTraitStackTraits`
   * ("[Takuya Kanbara] w/5 [Hybrid] trait cards under it: Cost 5", BT18-018; KB Q2925 ">= 5,
   * more is still legal"). A pre-validation gate, not a payment — the cards are not consumed.
   */
  minTraitStackCount?: number;
  minTraitStackTraits?: string[];
  /**
   * Digivolution-stack NAME gate on the BASE permanent: it must already have at least
   * `minNameStackCount` (default 1) cards UNDER it whose name exactly equals one of
   * `minNameStackNames`. Bracketed names identify a specific card rather than later forms. The NAME-based
   * sibling of `minTraitStackCount`/`minTraitStackTraits` ("w/[Ouryumon] digivolution card",
   * BT9-111; "w/[Arcturusmon] digivolution card", RB1-036). A pre-validation gate, not a
   * payment — the cards are not consumed.
   */
  minNameStackCount?: number;
  minNameStackNames?: string[];
  /**
   * Digivolution-stack count gate for BT18-102 (Susanoomon): the BASE permanent's stack
   * must contain at least `min` cards whose traits include `trait` (KB Q3055 "10+ [Hybrid]
   * in digivolution cards"). A pre-validation gate — the cards are not consumed. Distinct
   * from `minTraitStackCount`/`minTraitStackTraits` (which carry a single count+trait-list
   * pair for simpler gates) — `requiredDigivolutionCardCount` is the structured form used
   * by multi-Spirit cards whose alternate requirement is tied to a stack-count threshold.
   */
  requiredDigivolutionCardCount?: { trait: string; min: number };
  /**
   * When true, this alternate requirement CANNOT be used as the base for a
   * ＜Blast Digivolve＞ (KB Q3056: BT18-102's 10-[Hybrid] path is excluded from Blast
   * Digivolve — only the standard EvoCost is a valid Blast Digivolve candidate).
   * `matchingAlternateDigivolutionRequirement` skips entries with this flag when called
   * in a Blast Digivolve context.
   */
  incompatibleWithBlastDigivolve?: boolean;
  controllerControls?: {
    kind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
    namesExact?: string[];
    traits?: string[];
    min?: number;
  };
  /**
   * Minimum number of cards the digivolving player must have in trash for this alternate path.
   * Used by BT2-111's hand ability: exact [Impmon] may digivolve into Beelzemon for cost 4 only
   * while its controller has 10 or more cards in trash. This is an availability gate, not a cost;
   * no trash cards are consumed.
   */
  controllerTrashCountMin?: number;
  /** This alternate hand-evolution path is unavailable from the breeding area. */
  battleAreaOnly?: boolean;
  /**
   * Marks this requirement as Comprehensive Rules §8-3 Burst Digivolve, distinct from an
   * ordinary bracketed `[Digivolve]` alternate path (§8-3-2-4: "Burst digivolve can only be
   * performed by an effect that specifically performs burst digivolve"). Its presence drives
   * two extra procedural steps beyond the printed name/level/trait gates:
   *   - §8-3-3-2: BEFORE the digivolve cost is paid, the controller's battle-area Tamer
   *     permanent named in `returnTamerNamesExact` is returned to hand as a non-memory
   *     enabling cost. Distinct in SHAPE from `placementCost` (loose hand/trash CARDS moved
   *     to the deck bottom): this targets an existing battle-area PERMANENT by exact name and
   *     returns it to hand, so it cannot reuse that field.
   *   - §8-3-2-1..3: at the end of the turn the digivolve happened, the card then stacked
   *     immediately under the burst-digivolved permanent's top is trashed as PENDING
   *     PROCESSING (§18-1) — but only when a card is actually stacked there (§8-3-2-2) and it
   *     is STILL a Digimon card at that end-of-turn evaluation (§8-3-2-3: a card de-digivolved
   *     away by then is spared). The pending marker lives on `Permanent.burstDigivolvedTurnCount`,
   *     set when this path is used and consumed at the engine's real OnEndTurn firing point.
   */
  burstDigivolve?: {
    /** Exact name(s) of the battle-area Tamer permanent to return; a real card names exactly
     * one, but the field is a list for symmetry with the other `namesExact`-shaped gates. */
    returnTamerNamesExact: string[];
  };
}

/**
 * A base-GRANTED digivolution path: a Digimon in play that lets a SPECIFIC card in hand
 * digivolve ONTO it, for a fixed cost, ignoring the normal color/level requirement. The reverse
 * of {@link DigivolutionRequirement} — keyed by the BASE card, not the evolving card. Mirrors the
 * `targetPermanent == self` (the grant applies only while digivolving onto THIS permanent) and
 * whose `cardCondition` gates the evolving card (a name or trait). The grant is active only while
 * the granting card is on the battle area, on its controller's turn, and `condition` (when present)
 * holds. Examples: ST7-03 ("[Gallantmon] can digivolve onto this Guilmon, cost 4, while the
 * opponent has a Lv.6+ Digimon"), BT6-060 ("a [Three Musketeers] Digimon can digivolve onto this,
 * cost 6"). A structural play-legality field, not a parse hint.
 */
export interface BaseGrantedDigivolve {
  /** Which hand card may digivolve onto the granting permanent (the card digivolved INTO). */
  target: {
    /** EXACT evolving-card name. */
    namesExact?: string[];
    /** SUBSTRING evolving-card name ("[X] in its name"). */
    names?: string[];
    /** A trait the evolving card must carry ("[Three Musketeers]"). */
    traits?: string[];
  };
  /** The fixed memory cost paid for this granted digivolve. */
  cost: number;
  /** The granted path ignores the printed color+level digivolution requirement (it is its own gate). */
  ignoreRequirements: boolean;
  /**
   * Activation gate evaluated against live state at digivolve time (absent = active whenever the
   * granting card is a battle-area permanent on its controller's turn). The grant's own-turn +
   * battle-area requirements are enforced by the digivolve verb and the matcher, not encoded here.
   */
  condition?: { kind: "opponentHasDigimonLevelAtLeast"; level: number };
}

/**
 * A DNA-digivolve (Jogress) prerequisite parsed from the card's "DNA Digivolution: N
 * from <colorA> Lv.<a> + <colorB> Lv.<b>" header (or the bracketed/＜...＞ variants).
 * is a structural play-legality field, not a parse hint.
 */
export interface DnaDigivolveRequirement {
  /** The DNA-digivolve cost paid. */
  cost: number;
  /** The two (or more) material specs (color + level), in stated order. */
  materials: {
    color?: "Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple";
    level?: number;
    names?: string[];
    traits?: string[];
  }[];
}

/**
 * An App Fusion prerequisite parsed from the card's "[App Fusion] [A] & [B]: Cost N"
 * named-material fusion play path (the App-monster mechanic). A structural
 * play-legality field like DigivolutionRequirement, not a parse hint.
 */
export interface AppFusionRequirement {
  /** The required material card names (e.g. ["Logamon", "Timemon"]). */
  names: string[];
  /** The App-Fusion cost paid (default 0). */
  cost: number;
}

export interface LinkRequirement {
  /** The Link cost paid. */
  cost: number;
  /** Required name tokens on the link target. */
  names?: string[];
  /** Required trait tokens on the link target ("[Appmon] trait"). */
  traits?: string[];
}

/** One DigiXros material slot: cards matching `names`/`traits` (or the freeform `desc`). */
export interface DigiXrosMaterial {
  /** Material card-name tokens this slot accepts (from the DigiXrosConditionElement label). */
  names?: string[];
  /** Material trait tokens this slot accepts, when the predicate matches by trait. */
  traits?: string[];
  /** Substrings accepted within any printed trait ("[Dragon] in one of its traits"). */
  traitContains?: string[];
  /**
   * e.g. EX4-021's "Blue MetalGreymon" slot = name "MetalGreymon" AND color Blue).
   */
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /** Exact level when the material predicate uses `.Level == N` / `IsLevelN`. */
  level?: number;
  /** Maximum level when the material predicate uses `.Level <= N`. */
  levelMax?: number;
  /** Minimum level when the material predicate uses `.Level >= N`. */
  levelMin?: number;
  /**
   * Name-OR-trait disjunction the slot accepts ("a [Greymon] in name OR [Dragon]-trait card").
   * A material qualifies if it matches ANY ref (union), mirroring the engine `Filter.nameOrTrait`
   * union. Distinct from the AND-combined `names`+`traits` slot fields. Cards: BT19-065, BT21-030.
   */
  nameOrTrait?: { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" }[];
  /**
   * Static level comparison on the material ("a Lv.5 or lower Digimon" / "Lv.6 or higher").
   * `op` is the bound direction against `value`. Distinct from the exact `level` / `levelMin` /
   * `levelMax` fields — this is the comparison form the runtime record emits for "Lv.N or {lower,higher}".
   */
  levelComparison?: { op: "lte" | "gte" | "eq"; value: number };
  /** Original element label when it is not a plain card name ("Lv.4 w/[Tyrannomon] in name"). */
  desc?: string;
  /**
   * When true on a single-slot recipe ("place N [trait] Digimon WITH DIFFERENT CARD NUMBERS"
   * — BT19-065, BT21-030, EX3-013), every chosen material must additionally have a DISTINCT
   * card number (cardId): no two placed materials may share the same printed card. Purely a
   * cross-material distinctness constraint layered on top of the per-material slot match.
   */
  differentCardNumbers?: boolean;
  /** Every chosen material must have a distinct printed card name. */
  differentNames?: boolean;
}

/**
 * A DigiXros prerequisite parsed from the card's "[DigiXros -N] [A] x [B] ..." header.
 * the alternate "play this card by placing the named material cards under it" play method. A
 * structural play-legality field like DigivolutionRequirement / AppFusionRequirement.
 */
export interface DigiXrosRequirement {
  /**
   * The material slots (DigiXrosConditionElements) this card accepts. Each placed material must
   * match one DISTINCT slot; the player places any number of them (one per slot) from the legal
   * source zones (hand + battle area by default; trash / under-Tamer when an expander is active).
   */
  materials: DigiXrosMaterial[];
  /**
   * The per-material cost reduction. The play cost is
   * reduced by `count * (number of materials placed)` — "Each placed card reduces the play cost".
   * (The field is named `count` for back-compat with the compiler; it is NOT a material count.)
   *
   * `"∞"` means the player may contribute ANY number of matching materials (0 or more); total
   * discount = materials contributed × `count`... but since count is "∞" any number is accepted
   * and the per-unit reduction is supplied separately via `costReduction` when present.
   */
  count: number | "∞";
  /** Per-material cost reduction used when `count === "∞"` (the finite per-card discount). */
  costReduction?: number;
  /**
   * Upper bound on the total number of materials placed, when the recipe explicitly forbids
   * "one of each" alternative (KB ruling, e.g. EX6-025 Q3732: "you can place 1 [A], 1 [B], or
   * 1 [C]" — NOT more than one). Absent means unbounded (the default single-slot "place N of
   * [trait]" form, e.g. "[Bagra Army] x2", keeps accepting any number of matching materials).
   */
  maxMaterials?: number;
}

/** One Assembly material slot: cards matching `names`/`traits`, `elementCount` of them. */
export interface AssemblyMaterial {
  /** Material card-name tokens this slot accepts. */
  names?: string[];
  /** Material trait tokens this slot accepts, when the predicate matches by trait. */
  traits?: string[];
  /** Exact level when the material predicate uses `.Level == N` / `IsLevelN`. */
  level?: number;
  /** Maximum level when the material predicate uses `.Level <= N` ("Lv.N or lower"). */
  levelMax?: number;
  /** Minimum level when the material predicate uses `.Level >= N` ("Lv.N or higher"). */
  levelMin?: number;
  /**
   * Name-OR-trait disjunction the slot accepts ("[Agumon]/[Greymon] in name OR [ME]/[VB]
   * trait" — EX12-016/-017; "[Chronomon] in text OR [TS] trait" — BT26-073). A material
   * qualifies if it matches ANY ref (union), mirroring `DigiXrosMaterial.nameOrTrait` /
   * `digiXros.ts`'s `matchNameOrTrait` union exactly. Distinct from the AND-combined
   * `names`+`traits` slot fields — an "or" joining tokens of the SAME predicate kind (e.g.
   * two trait groups) instead folds into the ordinary `traits` OR-matched array; this field
   * is only for a disjunction ACROSS kinds that no AND-combined field can express.
   */
  nameOrTrait?: { tokens: string[]; match: "name" | "nameExact" | "trait" | "text" | "any" }[];
  /** Original selectMessage label when it is not a plain card name. */
  desc?: string;
  /** How many cards this slot needs (AssemblyConditionElement.elementCount, default 1). */
  count: number;
  /**
   * When true on a single-slot recipe ("N ... cards w/different levels"), every chosen material
   * must additionally have a DISTINCT level: no two placed materials may share a level. Mirrors
   * `DigiXrosMaterial.differentCardNumbers`'s cross-material-distinctness shape.
   */
  differentLevels?: boolean;
  /**
   * When true on a single-slot recipe ("N ... cards w/different names" — EX12-060, EX12-076),
   * every chosen material must additionally have a DISTINCT name: no two placed materials may
   * share a printed name. Mirrors `DigiXrosMaterial.differentCardNumbers`'s shape.
   */
  differentNames?: boolean;
}

/**
 * `rule implementation` -> `AssemblyCondition(elements, reduceCost: N)` — the
 * alternate-play path that assembles named material Digimon at a reduced cost. A structural
 * play-legality field like AppFusionRequirement, not a parse hint.
 */
export interface AssemblyRequirement {
  /** The material slots assembled to play this card. */
  materials: AssemblyMaterial[];
  /** The cost reduction applied when assembling (AssemblyCondition.reduceCost, default 0). */
  reduceCost: number;
}

/**
 * `the effect factory.MindLinkSelfEffect` / `PlayMindLinkTamerFromDigivolutionCards` — the
 * Digimon/Tamer pairing mechanic. v1 captures the presence (and the Tamer-name tokens when
 * a structured pairing is given) as a structural record; the continuous pairing behavior is
 * not yet executed (no Mind-Link runtime subsystem).
 */
export interface MindLinkRequirement {
  /** Tamer-name tokens the source mind-links with, when the documented behavior names them. */
  names?: string[];
  /** True when the record was captured from the bare ＜Mind Link＞ self keyword (no names). */
  fromKeyword?: boolean;
}

/** The compiled record for one card, as stored in effects.json (keyed by cardId). */
export interface CompiledCard {
  effects: CardEffect[];
  coverage: Coverage;
  /** Residual prose fragments the parser could not fully model. */
  residual: string[];
  /**
   * Digivolve / alternate-evolution prerequisites parsed from the cost header(s).
   * Absent when the card has no digivolve requirement section (Lv.2/3 base Digimon,
   * Tamers, Options). Multiple entries when the card lists multiple paths.
   */
  digivolutionRequirement?: DigivolutionRequirement[];
  /**
   * DNA-digivolve (Jogress) prerequisites parsed from a "DNA Digivolution: ..." header.
   * Absent when the card has no DNA-digivolve section.
   */
  dnaDigivolveRequirement?: DnaDigivolveRequirement[];
  /**
   * App Fusion prerequisites parsed from an "[App Fusion] [A] & [B]: Cost N" header.
   * Absent when the card has no App-Fusion section.
   */
  appFusionRequirement?: AppFusionRequirement[];
  /**
   * Link prerequisites parsed from the card's link header (what it may be linked to and
   * at what cost). Absent when the card has no link condition.
   */
  linkRequirement?: LinkRequirement[];
  /**
   * DigiXros prerequisites parsed from a "[DigiXros -N] ..." header. Absent when the card
   * has no DigiXros section.
   */
  digiXrosRequirement?: DigiXrosRequirement[];
  /**
   * Assembly prerequisites parsed from an "[Assembly] ..." header. Absent when the card has
   * no Assembly section.
   */
  assemblyRequirement?: AssemblyRequirement[];
  /**
   * Mind Link records parsed from a ＜Mind Link＞ ability. Absent when the card has no Mind
   * Link. Structural capture only (the pairing behavior is not yet executed).
   */
  mindLinkRequirement?: MindLinkRequirement[];
}

/** The whole effects.json shape: cardId -> compiled record. */
export type CompiledEffects = Record<string, CompiledCard>;
