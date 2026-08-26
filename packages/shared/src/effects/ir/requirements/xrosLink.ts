// DigiXros, Link, and Mind Link prerequisites.

/** One DigiXros material slot: cards matching `names`/`traits`, or the freeform `desc`. */
export interface DigiXrosMaterial {
  names?: string[];
  traits?: string[];
  /** Substrings accepted within any printed trait ("[Dragon] in one of its traits"). */
  traitContains?: string[];
  /** ANDed with the other slot fields — EX4-021's "Blue MetalGreymon" slot. */
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  level?: number;
  levelMax?: number;
  levelMin?: number;
  /**
   * Disjunction ACROSS predicate kinds ("[Greymon] in name OR [Dragon] trait" — BT19-065,
   * BT21-030). A material qualifies on ANY ref, unlike the AND-combined `names`+`traits`.
   */
  nameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "traitContains" | "text" | "any";
  }[];
  /** Tokens that must occur in the material's printed card text. */
  texts?: string[];
  /** The "Lv.N or {lower,higher}" comparison form, distinct from exact `level`/`levelMin`/`levelMax`. */
  levelComparison?: { op: "lte" | "gte" | "eq"; value: number };
  /** Original element label when it is not a plain card name ("Lv.4 w/[Tyrannomon] in name"). */
  desc?: string;
  /**
   * Cross-material constraint on a single-slot recipe: no two placed materials may share a
   * cardId ("place N [trait] Digimon with different card numbers" — BT19-065, BT21-030, EX3-013).
   */
  differentCardNumbers?: boolean;
  /** Cross-material constraint: no two placed materials may share a printed name. */
  differentNames?: boolean;
}

/**
 * A DigiXros prerequisite from the "[DigiXros -N] [A] x [B] ..." header — the alternate play
 * path that places the named materials under this card. A structural play-legality field.
 */
export interface DigiXrosRequirement {
  /**
   * Each placed material must match one DISTINCT slot. Sources are hand + battle area by
   * default, plus trash and under-Tamer while an expander is active.
   */
  materials: DigiXrosMaterial[];
  /**
   * The PER-MATERIAL cost reduction, not a material count — the name is back-compat with the
   * compiler. `"∞"` lets the player contribute any number of matching materials, with the
   * per-unit discount supplied by `costReduction` instead.
   */
  count: number | "∞";
  /** The finite per-card discount used when `count === "∞"`. */
  costReduction?: number;
  /**
   * Total material cap for recipes that forbid the "one of each" reading (KB EX6-025 Q3732:
   * "1 [A], 1 [B], or 1 [C]" — not more than one). Absent means unbounded, which is what the
   * single-slot "[Bagra Army] x2" form needs.
   */
  maxMaterials?: number;
}

export interface LinkRequirement {
  cost: number;
  names?: string[];
  /** "[Appmon] trait". */
  traits?: string[];
}

/**
 * The Digimon/Tamer pairing mechanic. v1 records only the presence, plus the Tamer-name tokens
 * when a structured pairing is given; the continuous pairing behavior has no runtime subsystem yet.
 */
export interface MindLinkRequirement {
  names?: string[];
  /** Captured from the bare ＜Mind Link＞ self keyword, which names no Tamer. */
  fromKeyword?: boolean;
}
