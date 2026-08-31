// Predicates on a PERMANENT's live board state: seat, zone, suspension, and digivolution stack.
// Answering these needs the game state, not just the card definition.

import type { Filter } from "./filter.js";
import type { Controller, ZoneRef } from "./zones.js";

export interface BoardPredicates {
  controller?: Controller;
  /**
   * Seat scope guessed for targets whose prose carried no controller predicate (`controller`
   * must stay unset — it is part of the structural signature). Read only for seat enumeration,
   * never for matching.
   */
  controllerDefault?: Controller;
  /** Several zones pool their candidates into one set (EX9-057's trash-or-digivolution-cards). */
  zone?: ZoneRef | ZoneRef[];
  /** Position within the zone stack; only meaningful for `zone: "security"`, where `"top"` is
   * the card checked next (index 0). Without it, any security card qualifies (BT19-029, BT20-080). */
  position?: "top" | "bottom";
  /** Loose stacked/security card must currently be face up/down. */
  faceUp?: boolean;
  faceDown?: boolean;
  /**
   * Digivolution-stack loose candidates within the BOTTOM N positions (EX9-073), rather than
   * the single card `position: "bottom"` selects.
   */
  withinBottomN?: number;
  /** The card must have exactly one color. */
  singleColor?: boolean;
  /** Cost-only: the stack card's level must be represented at least twice. */
  sameLevelPair?: boolean;
  /** The live permanent's top card and digivolution cards contain N cards sharing a level. */
  stackHasSameLevelCards?: number;
  suspended?: boolean;
  unsuspended?: boolean;
  /** Candidate has the same suspended/unsuspended orientation as the live effect source. */
  sameOrientationAsSource?: boolean;
  /** "this Digimon" / "this card". */
  isSelfRef?: boolean;
  /**
   * Match `nameOrTrait` text references against only the information printed on the
   * permanent's top card. Digivolution-card inherited effects and granted effects are
   * effects the Digimon gains, not text it gains (Comprehensive Rules 4-23-2).
   */
  printedTextOnly?: boolean;
  /** Match the permanent that drove the enclosing watcher when this filter is nested as a host filter. */
  sourceRef?: "triggerSubject";
  /** "another", "other". */
  excludeSelf?: boolean;
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
  /** Shares the live top-card name of a permanent selected earlier in this resolution. */
  sameNameAsSelection?: string;
  /**
   * Loose-candidate only: face-down OR carrying the trait (EX9-073). Reads the live `faceUp`
   * flag, so `candidateLooseInstances` honors it and `definitionMatches` cannot.
   */
  faceDownOrTrait?: { tokens: string[]; match: "trait" };
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
  /**
   * `"hasNone"` is the explicit complement of `"hasAny"` (BT17-064, BT17-100); `"hasAny"` also
   * covers the Mind Link guard's "no Tamer cards" reading when combined with kind Digimon.
   */
  digivolutionCards?: "none" | "hasNone" | "hasAny" | "hasFaceDown";
  /**
   * Upper bound on how many cards may match, for the "you have 1 or fewer Digimon" shape. Read
   * by the `youHave`/`opponentHas` conditions, which invert the default at-least comparison.
   */
  countMax?: number;
  /** Alias for `digivolutionCards: "hasAny"` (BT17-098). */
  hasDigivolutionCards?: boolean;
  /** Candidate color matches at least one color in the source Digimon's stack (EX9-074). */
  colorMatchesAnyDigivolutionCard?: boolean;
  /**
   * The STACK contains a card of one of these kinds (BT17-090). Distinct from
   * `digivolutionCards:"hasAny"`, which only asks whether the stack is non-empty.
   */
  digivolutionStackKind?: string[];
  /** The STACK contains no card of any requested kind (BT20-003). */
  digivolutionStackKindExclude?: string[];
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
  /** Reject the permanent if any card under its top has one of these exact names (BT17-100). */
  excludeCardsNamed?: string[];
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
}
