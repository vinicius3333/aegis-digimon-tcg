// Alternative field shapes emitted by the action-handler compiler
// (tools/lib/action-handlers/). The interpreter normalizes them to the canonical predicates at
// match time. Keep in sync with effects.json.

import type { Condition } from "../predicates/conditions.js";
import type { Cost } from "../predicates/costs.js";
import type { Filter, Target } from "./filter.js";

export interface CompilerAliases {
  /** `{ max }`, `{ min, max }`, `{ op, value }`, a dynamic security-count ceiling, or `"same"`. */
  level?:
    | { max?: number; min?: number; op?: "gte" | "lte" | "eq"; value?: number | string }
    | { lte: { kind: "chooseEitherSecurityCount" } }
    | string;
  /** Shorthand for `kind: ["Digimon"]`. */
  digimon?: boolean;
  /** Shorthand for `kind: ["Tamer"]`. */
  tamer?: boolean;
  /** Shorthand for `colors`. */
  color?: string | string[];
  /** Shorthand for `nameOrTrait`. */
  name?: string | { tokens: string[]; match: "name" | "nameExact" | "trait" | "traitContains" | "text" | "any" };
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
  /** Alternative to `excludeNames`. */
  exclude?: string[];
  excludeKind?: string[];
  /** Alternative to `excludeNameOrTrait`. */
  notTrait?: string[];
  /** Cost-only: every selected digivolution card must come from one host permanent. */
  sameHost?: boolean;
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
  nameContains?: string;
}
