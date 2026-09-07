// DNA digivolution, App Fusion, and Assembly prerequisites.

/**
 * A DNA-digivolve (Jogress) prerequisite from the "DNA Digivolution: N from <colorA> Lv.<a> +
 * <colorB> Lv.<b>" header. A structural play-legality field, not a parse hint.
 */
export interface DnaDigivolveRequirement {
  cost: number;
  /** The material specs, in stated order. */
  materials: {
    color?: "Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple";
    level?: number;
    names?: string[];
    /** Exact required material card names for bracketed named DNA sources. */
    namesExact?: string[];
    /**
     * Names the material must carry in its printed text rather than in its name
     * (BT20-081: "Yellow Lv.6 w/[Pulsemon] in text").
     */
    namesInText?: string[];
    traits?: string[];
  }[];
}

/**
 * An App Fusion prerequisite from the "[App Fusion] [A] & [B]: Cost N" header. A structural
 * play-legality field, not a parse hint.
 */
export interface AppFusionRequirement {
  /** Required material card names, e.g. ["Logamon", "Timemon"]. */
  names: string[];
  cost: number;
}

/** One Assembly material slot: `count` cards matching its name/trait predicates. */
export interface AssemblyMaterial {
  /** At least one printed color must match (EX11-036 green / EX11-045 black). */
  colors?: ("Red" | "Blue" | "Yellow" | "Green" | "White" | "Black" | "Purple")[];
  /** Card kinds allowed as materials when the header says, for example, "Digimon cards". */
  kinds?: ("Digimon" | "Tamer" | "Option" | "DigiEgg")[];
  /** Name substrings for headers that explicitly say "in name". */
  names?: string[];
  /** Exact card names for bracket-only named materials such as `[Plutomon]`. */
  namesExact?: string[];
  traits?: string[];
  level?: number;
  levelMax?: number;
  levelMin?: number;
  /**
   * Disjunction ACROSS predicate kinds ("[Agumon]/[Greymon] in name OR [ME]/[VB] trait" —
   * EX12-016/-017; "[Chronomon] in text OR [TS] trait" — BT26-073). An "or" joining tokens of
   * the SAME kind folds into the already OR-matched `traits`/`names` arrays instead.
   */
  nameOrTrait?: {
    tokens: string[];
    match: "name" | "nameExact" | "trait" | "traitContains" | "text" | "any";
  }[];
  /** Original selectMessage label when it is not a plain card name. */
  desc?: string;
  /** Default 1. */
  count: number;
  /** Cross-material constraint: no two placed materials may share a level. */
  differentLevels?: boolean;
  /** Cross-material constraint: no two placed materials may share a name (EX12-060, EX12-076). */
  differentNames?: boolean;
}

/**
 * The alternate-play path that assembles named material Digimon at a reduced cost. A structural
 * play-legality field, not a parse hint.
 */
export interface AssemblyRequirement {
  materials: AssemblyMaterial[];
  /** Default 0. */
  reduceCost: number;
}
