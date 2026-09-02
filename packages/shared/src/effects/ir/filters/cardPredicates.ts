// Predicates on what a CARD is: its printed kind, colors, levels, names, costs, and keywords.
// Everything here is answerable from the card definition alone.

import type { Keyword } from "../keywords.js";
import type { Scaling } from "../predicates/scaling.js";
import type { DpComparison } from "./dp.js";
import type { Filter } from "./filter.js";

export type FilterKeyword = Keyword;

export interface CardPredicates {
  /** Exact card-number match, used when printed text says "this card" rather than a name family. */
  cardId?: string;
  /**
   * Restricts the match to token permanents (`true`) or excludes them (`false`). Absent ⇒ tokens
   * match on the same terms as printed cards.
   */
  isToken?: boolean;
  /**
   * Within-filter UNION: a card qualifies if it matches this filter's own predicates OR any of
   * these alternatives. The filter-level twin of {@link Target.orFilters}.
   */
  orFilters?: Filter[];
  /** Loose-card candidate gate: its owner's trash has at least `count` cards whose names contain a token. */
  ownerTrashNameCountGte?: { count: number; tokens: string[] };
  kind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /** Printed form/classification, such as Rookie, Champion, Ultimate, or Mega. */
  forms?: string[];
  /** Alias for `nameOrTrait: [{ match: "trait" }]`. */
  traits?: string[];
  /** Any printed trait contains any token (case-insensitive). */
  traitContains?: string[];
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /** Every listed color must be present (conjunctive counterpart to the OR-matched `colors`). */
  colorsAll?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
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
  /**
   * DP bound matched against the card's PRINTED DP rather than a permanent's live DP, for
   * filters evaluated while the cards are still in hand/deck (RestrictPlay, EX7-014).
   */
  dpAtMost?: number;
  /** Runtime bonus added to the printed-DP ceiling for hand/deck candidates. */
  dpAtMostScaling?: Scaling;
  playCostLte?: number;
  /**
   * Use-cost ceiling evaluated with active hand-use reductions, rather than the
   * card's printed play cost (LM-023 Q5516).
   *
   * This is intentionally limited to loose-card selection. Permanent targets
   * continue to use `playCostLte`, whose contract is the printed play cost.
   */
  effectiveUseCostLte?: number;
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
   * `[Bracket]` refs from the clause. `nameExact` is literal card-name equality, so
   * "[Cerberusmon]" excludes "Cerberusmon: Werewolf Mode".
   *
   * Entries are always a union: a card qualifies when any entry matches (`definitionMatches`).
   * `orPrevious` is an explicit marker of that union ("[Data] or [Witchelny] trait" — BT19-029,
   * BT19-055, BT21-054, BT21-080); to AND a trait with a name, pair `nameOrTrait` with `traits`.
   */
  nameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "traitContains" | "text" | "any";
    orPrevious?: boolean;
    /** "non-[X]" (BT10-069): qualifies a candidate that does NOT match. */
    negate?: boolean;
  }[];
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
  hasDnaDigivolutionRequirement?: boolean;
  /**
   * `definition.level` is a number > 0. Excludes Lv.- cards (Digi-Eggs, level-less Digimon) —
   * KB Q2807/Q2928.
   */
  hasLevel?: boolean;
  /** "other than [DoruGreymon], [BurningGreymon], ...": excluded even if the rest matches. */
  excludeNames?: string[];
  /** Exact card-number exclusion for rulings that distinguish same-name printings (BT18-034 Q4999). */
  excludeCardIds?: string[];
  /**
   * Exclusion spanning name/trait/text (EX10-035), each ref carrying its own `match` mode.
   * `excludeNames` is name-substring only.
   */
  excludeNameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "traitContains" | "text" | "any";
  }[];
  /** Candidate's effective name must differ from every Tamer the controller has in play. */
  excludeSameNameAsOwnTamers?: boolean;
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
}
