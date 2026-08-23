import { CardColor, CardKind } from "../schema/enums.js";

/**
 * A color + level requirement to digivolve. Each entry records the memory paid to
 * digivolve onto a base Digimon of `Color` at most `Level`. A card lists one
 * entry per acceptable base color.
 *
 * The memory paid is stored in `memoryCost`.
 */
export interface EvoCost {
  color: CardColor;
  level: number;
  memoryCost: number;
}

/**
 * Static, read-only card facts from the committed card-data snapshot in
 * `cards/data/cards.json`. Per-copy runtime data lives on the CardInstance
 * schema, not here. Keyed by `cardId` in the registry.
 *
 * Field names follow the terminology used by the runtime and protocol.
 */
export interface CardDefinition {
  cardId: string; // e.g. "BT7-089"
  set: string; // set prefix derived from cardId, e.g. "BT7", "EX2", "ST10", "P"
  nameEn: string;
  nameJp?: string;

  kinds: CardKind[]; // card type; a card can be dual-kind (e.g. Digimon + Option)
  colors: CardColor[];
  level?: number; // Digimon/DigiEgg level (1-7); undefined when 0 / not applicable

  playCost: number; // memory cost to play; -1 when the card has none (e.g. DigiEgg)
  dp: number; // Digimon Power (0 for non-Digimon)
  evoCosts: EvoCost[]; // color + level + memory requirements to digivolve

  forms?: string[]; // "Champion", "Rookie", ...
  attributes?: string[]; // "Virus", "Data", "Vaccine", ...
  types?: string[]; // "Mythical Beast", "Dinosaur", ...

  effectText?: string;
  inheritedEffectText?: string; // granted via the digivolution stack (ESS)
  securityEffectText?: string; // triggered on a security check

  rarity?: string; // "C" | "U" | "R" | "SR" | "UR" | "SEC" | "P"
  maxCountInDeck: number; // usually 4

  // Display only; resolved by the client to a CDN/static path. Never used by rules.
  // Alternate-art (`_P<n>`) variants collapse to the base card's image id.
  imageId?: string;

  // --- Optional / advanced mechanics (present only when the card uses them) ---
  isAce?: boolean; // ACE card (OverflowMemory >= 1)
  overflowMemory?: number; // ACE overflow value
  linkDp?: number; // Link mechanic bonus DP
  linkEffect?: string;
  linkRequirement?: string;
  dualEffect?: string; // dual-type card secondary effect
  optionEffect?: string;
  optionColorRequirements?: CardColor[]; // color requirement for Option cards
  isDualCard?: boolean; // multiple kinds (kinds.length > 1)
  /** Synthetic token card (not in deck; spawned by effects). */
  isToken?: boolean;
}

/** Convenience predicates derived from `kinds`. */
export const isDigimon = (def: CardDefinition): boolean => def.kinds.includes(CardKind.Digimon);
export const isTamer = (def: CardDefinition): boolean => def.kinds.includes(CardKind.Tamer);
export const isOption = (def: CardDefinition): boolean => def.kinds.includes(CardKind.Option);
export const isDigiEgg = (def: CardDefinition): boolean => def.kinds.includes(CardKind.DigiEgg);
