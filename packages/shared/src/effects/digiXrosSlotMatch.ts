// The single DigiXros recipe-slot predicate. The authoritative server play check and the
// client's material picker both read it so they cannot disagree about which cards a slot accepts.

import { isDigimon, type CardDefinition } from "../cards/types.js";
import type { DigiXrosMaterial } from "./ir/requirements/xrosLink.js";

export type DigiXrosNameOrTraitRef = NonNullable<DigiXrosMaterial["nameOrTrait"]>[number];

/**
 * Name/trait matching stays with each caller: the server resolves rule-granted traits and
 * catalog aliases through the live engine, the client through its definition-only matcher.
 */
export interface DigiXrosSlotMatchers {
  hasTrait(definition: CardDefinition, trait: string): boolean;
  matchNameOrTrait(definition: CardDefinition, ref: DigiXrosNameOrTraitRef): boolean;
}

/**
 * Whether a material's definition satisfies a single recipe slot (name AND trait AND color AND
 * level gates, all ANDed).
 *
 * `digiXrosNames` carries additional name aliases granted to this material specifically for
 * DigiXros matching (the "also treated as [X] for a DigiXros" grant, KB Q3068/Q3105/Q3119).
 */
export function digiXrosSlotMatches(
  definition: CardDefinition,
  slot: DigiXrosMaterial,
  matchers: DigiXrosSlotMatchers,
  digiXrosNames: readonly string[] = [],
): boolean {
  // Named DigiXros slots may explicitly name non-Digimon cards (BT19-102 names a Tamer).
  // Unnamed/trait-only slots stay Digimon-only so unrelated Tamers and Options cannot leak in.
  if (
    !isDigimon(definition) &&
    !(slot.names?.some((name) => definition.nameEn.toLowerCase() === name.toLowerCase()) ?? false)
  ) {
    return false;
  }
  if (slot.names && slot.names.length > 0) {
    // Plain DigiXros recipe slots are printed card names (`[Greymon]`), not "contains [Greymon]"
    // filters. Match the printed/DigiXros-alias names exactly; substring matching is represented
    // explicitly by nameOrTrait/name.
    const allNames = [definition.nameEn, ...digiXrosNames];
    if (!slot.names.some((wanted) => allNames.some((name) => name.toLowerCase() === wanted.toLowerCase()))) {
      return false;
    }
  }
  if (slot.traits && slot.traits.length > 0) {
    if (!slot.traits.some((trait) => matchers.hasTrait(definition, trait))) return false;
  }
  if (slot.traitContains && slot.traitContains.length > 0) {
    const traits = definition.types ?? [];
    if (
      !slot.traitContains.some((token) => traits.some((trait) => trait.toLowerCase().includes(token.toLowerCase())))
    ) {
      return false;
    }
  }
  if (slot.colors && slot.colors.length > 0) {
    if (!slot.colors.some((color) => definition.colors.some((actual) => String(actual) === color))) return false;
  }
  // Name-OR-trait disjunction ("[Greymon] in name OR [Dragon] trait"): qualify on any ref
  // (BT19-065, BT21-030).
  if (slot.nameOrTrait && slot.nameOrTrait.length > 0) {
    if (!slot.nameOrTrait.some((ref) => matchers.matchNameOrTrait(definition, ref))) return false;
  }
  // Printed text slots (BT12-011/074/075: "1 Digimon card with ＜Save＞ in its text") are
  // structural recipe predicates, matched through the same full-card-text union as other
  // "in its text" filters.
  if (slot.texts && slot.texts.length > 0) {
    if (!matchers.matchNameOrTrait(definition, { tokens: slot.texts, match: "text" })) return false;
  }
  if (slot.level !== undefined && definition.level !== slot.level) return false;
  if (slot.levelMin !== undefined && (definition.level === undefined || definition.level < slot.levelMin)) return false;
  if (slot.levelMax !== undefined && (definition.level === undefined || definition.level > slot.levelMax)) return false;
  // Static level comparison ("Lv.5 or lower"/"Lv.6 or higher"): a level-less material never matches.
  if (slot.levelComparison !== undefined) {
    const { op, value } = slot.levelComparison;
    if (definition.level === undefined) return false;
    if (op === "lte" && !(definition.level <= value)) return false;
    if (op === "gte" && !(definition.level >= value)) return false;
    if (op === "eq" && definition.level !== value) return false;
  }
  // A desc-only slot (no structured predicate) cannot be matched precisely — reject so we never
  // accept an unconstrained material.
  return (
    (slot.names?.length ?? 0) > 0 ||
    (slot.traits?.length ?? 0) > 0 ||
    (slot.traitContains?.length ?? 0) > 0 ||
    (slot.colors?.length ?? 0) > 0 ||
    (slot.nameOrTrait?.length ?? 0) > 0 ||
    (slot.texts?.length ?? 0) > 0 ||
    slot.level !== undefined ||
    slot.levelMin !== undefined ||
    slot.levelMax !== undefined ||
    slot.levelComparison !== undefined
  );
}
