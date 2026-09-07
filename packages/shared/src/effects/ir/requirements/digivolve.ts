// Structured digivolution prerequisites, printed and granted.

import type { Condition } from "../predicates/conditions.js";

export interface DigivolutionRequirement {
  /** Zones from which this alternate path is printed to operate (for example, BT7-111 is hand-only). */
  sourceZones?: ("hand" | "trash")[];
  /** Live condition that must hold for this alternate path to be available. */
  whileCondition?: Condition;
  /** Required level of the card digivolved FROM ("Lv.5" / "from Lv.3"). */
  level?: number;
  levelMax?: number;
  levelMin?: number;
  /** SUBSTRING name match on the source ("w/[Terriermon]/[Lopmon] in name"). */
  names?: string[];
  /**
   * EXACT source card names, for "digivolve from [ExactCard]" paths (Armor / X-Antibody /
   * Blast). A substring `names` match would wrongly accept relatives: "Veemon" ⊂ "ExVeemon",
   * "Garurumon" ⊂ "WereGarurumon".
   */
  namesExact?: string[];
  /** Required trait tokens on the source ("w/[Xros Heart] in traits"). */
  traits?: string[];
  /** Substrings accepted anywhere in a source trait ("[Aqua] in any of its traits"). */
  traitSubstrings?: string[];
  /** Traits the source must NOT have (EX8-037). Any listed trait excludes the base. */
  excludeTraits?: string[];
  /** At least one printed source color must match (for example, "yellow, green, or purple"). */
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /** Exact number of printed colors on the source (used with `colors` for two-color paths). */
  colorCount?: number;
  /** Text tokens the source must contain ("w/[Pulsemon] in text"). */
  texts?: string[];
  cost: number;
  /** An alternate `[Digivolve] ...` path rather than the primary printed requirement. */
  isAlternate: boolean;
  /**
   * The base digivolved ONTO must be a Tamer ("digivolve onto one of your Tamers as if the
   * Tamer is a level N Digimon", BT7-112).
   */
  baseIsTamer?: boolean;
  /** At least one listed color must appear in the base's colors ("onto one of your black Tamers"). */
  baseColors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /** Maximum number of printed colors on the base (BT25-084: "[Titamon] w/o 3 colors"). */
  baseColorCountMax?: number;
  /**
   * Required printed play cost of the base, to separate same-name reprints (three "Ceresmon"
   * cards share a name; only the play-cost-12 prints qualify — BT26-032). Paired with
   * `names`/`namesExact`, never used alone.
   */
  basePlayCost?: number;
  /** Minimum printed play cost of the base (BT20-101: "play cost 10 or higher"). */
  basePlayCostMin?: number;
  /** Maximum printed play cost of the base (BT16-048: "play cost 13 or less"). */
  basePlayCostMax?: number;
  /**
   * A NON-MEMORY enabling cost paid on top of `cost`: place `count` matching cards from `from`
   * at the BOTTOM of the owner's deck (BT7-112). The path is unavailable unless `count`
   * matching cards exist.
   */
  placementCost?: {
    count: number;
    from: ("hand" | "trash")[];
    kinds?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
    traits?: string[];
  };
  /**
   * The BASE must already have >= `minTraitStackCount` cards under it carrying one of
   * `minTraitStackTraits` (BT18-018; KB Q2925 — more is still legal). A gate, not a payment;
   * the cards are not consumed.
   */
  minTraitStackCount?: number;
  minTraitStackTraits?: string[];
  /**
   * Name-based sibling of `minTraitStackCount`: the BASE must already have >= `minNameStackCount`
   * (default 1) cards under it whose name exactly equals one of `minNameStackNames` (BT9-111,
   * RB1-036). A gate, not a payment.
   */
  minNameStackCount?: number;
  minNameStackNames?: string[];
  /**
   * The structured stack-count gate used by multi-Spirit cards (BT18-102; KB Q3055). Distinct
   * from `minTraitStackCount`/`minTraitStackTraits`, which carry a single count + trait-list pair.
   */
  requiredDigivolutionCardCount?: { trait: string; min: number };
  /**
   * This alternate path cannot serve as the base for a ＜Blast Digivolve＞ — only the standard
   * EvoCost can (KB Q3056, BT18-102). `matchingAlternateDigivolutionRequirement` skips flagged
   * entries in a Blast Digivolve context.
   */
  incompatibleWithBlastDigivolve?: boolean;
  controllerControls?: {
    kind?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
    namesExact?: string[];
    traits?: string[];
    min?: number;
  };
  /**
   * Availability gate, not a cost: BT2-111's [Impmon] may digivolve into Beelzemon for cost 4
   * only while its controller has this many cards in trash. No trash cards are consumed.
   */
  controllerTrashCountMin?: number;
  /**
   * Availability gate: the opponent must control a battle-area Digimon whose current DP is at
   * least this value (BT23-013). Continuous DP modifiers therefore affect whether the path is
   * available; printed base DP alone is not sufficient.
   */
  opponentDigimonDpMin?: number;
  /** This alternate hand-evolution path is unavailable from the breeding area. */
  battleAreaOnly?: boolean;
  /**
   * Comprehensive Rules §8-3 Burst Digivolve, not an ordinary bracketed alternate path
   * (§8-3-2-4: only an effect that specifically performs burst digivolve may use it). Drives two
   * procedural steps beyond the printed gates:
   *   - §8-3-3-2: before the cost is paid, the battle-area Tamer named in
   *     `returnTamerNamesExact` returns to hand. Unlike `placementCost` (loose cards to the deck
   *     bottom), this targets an existing PERMANENT by exact name.
   *   - §8-3-2-1..3: at end of that turn, the card stacked immediately under the top is trashed
   *     as pending processing (§18-1) — only if one is actually there (§8-3-2-2) and it is still
   *     a Digimon card then (§8-3-2-3; one de-digivolved away by then is spared). Tracked on
   *     `Permanent.burstDigivolvedTurnCount`.
   */
  burstDigivolve?: {
    /** A real card names exactly one; the list mirrors the other `namesExact` gates. */
    returnTamerNamesExact: string[];
  };
}

/**
 * A base-GRANTED digivolution path: a Digimon in play that lets a specific card in hand
 * digivolve ONTO it for a fixed cost, ignoring the normal color/level requirement. The reverse
 * of {@link DigivolutionRequirement} — keyed by the BASE card, not the evolving one. Active only
 * while the granting card is on the battle area, on its controller's turn, and `condition` holds.
 * ST7-03, BT6-060. A structural play-legality field, not a parse hint.
 */
export interface BaseGrantedDigivolve {
  /** Which hand card may digivolve onto the granting permanent. */
  target: {
    namesExact?: string[];
    /** SUBSTRING match ("[X] in its name"). */
    names?: string[];
    traits?: string[];
  };
  cost: number;
  /** The granted path is its own gate, replacing the printed color+level requirement. */
  ignoreRequirements: boolean;
  /**
   * Evaluated against live state at digivolve time. Absent means active whenever the granting
   * card is a battle-area permanent on its controller's turn — those two requirements live in
   * the digivolve verb and the matcher, not here.
   */
  condition?: BaseGrantedDigivolveCondition;
}

/**
 * A granted path's activation gate. `anyOf` carries the printed "A or B" alternatives (BT21-040);
 * the leaf kinds are the board reads those alternatives are stated in.
 */
export type BaseGrantedDigivolveCondition =
  | { kind: "securityAtMost"; count: number }
  | { kind: "opponentHasDigimonLevelAtLeast"; level: number }
  /** "you have N or more [trait] Tamers with different names" */
  | { kind: "distinctNamedTamersWithTrait"; trait: string; count: number }
  /** "you have a Tamer with [X] in its text" (full printed-text union). */
  | { kind: "tamerHasText"; text: string }
  | { kind: "anyOf"; conditions: BaseGrantedDigivolveCondition[] };
