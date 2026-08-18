// Structured digivolution, DigiXros, Link, and Assembly requirements.

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
