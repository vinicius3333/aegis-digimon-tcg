/* The card-pool filter: what can be filtered on, whether a card passes, and the hook
   that holds a screen's current selection. */

import { useMemo, useState } from "react";
import { type CardColor, type CardDefinition } from "@aegis/shared";
import { colorKey, kindOf, type ColorName } from "../design/theme";
import { collectionOrder, sortCards } from "./cardSorting";

export const KIND_FILTERS = ["Digimon", "DigiEgg", "Tamer", "Option"] as const;

export const LEVEL_FILTERS = [2, 3, 4, 5, 6, 7] as const;

export const COST_FILTERS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

export const RARITY_FILTERS = ["C", "U", "R", "SR", "UR", "SEC", "P", "-"] as const;

export const CARD_SORTS = ["releaseDate", "name", "dp", "level", "playCost", "type", "cardNumber", "random"] as const;

export type KindFilter = (typeof KIND_FILTERS)[number];

export type LevelFilter = (typeof LEVEL_FILTERS)[number];

export type CostFilter = (typeof COST_FILTERS)[number];

export type RarityFilter = (typeof RARITY_FILTERS)[number];

export type CardSort = (typeof CARD_SORTS)[number];

export type ColorFilterMode = "any" | "all";

export function matchesColorFilter({
  cardColors,
  selectedColors,
  mode,
}: {
  cardColors: readonly CardColor[];
  selectedColors: readonly ColorName[];
  mode: ColorFilterMode;
}): boolean {
  if (selectedColors.length === 0) return true;
  const hasColor = (selectedColor: ColorName): boolean =>
    cardColors.some((cardColor) => colorKey(cardColor) === selectedColor);
  return mode === "all" ? selectedColors.every(hasColor) : selectedColors.some(hasColor);
}

export function matchesLevelFilter(cardLevel: number | undefined, selectedLevels: readonly LevelFilter[]): boolean {
  return selectedLevels.length === 0 || selectedLevels.some((level) => level === cardLevel);
}

/** The final cost chip is a 7-or-more bucket, so high-cost cards remain discoverable. */
export function matchesCostFilter(playCost: number, selectedCosts: readonly CostFilter[]): boolean {
  return (
    selectedCosts.length === 0 || selectedCosts.some((cost) => (cost === 7 ? playCost >= cost : playCost === cost))
  );
}

export function matchesRarityFilter(
  cardRarity: string | undefined,
  selectedRarities: readonly RarityFilter[],
): boolean {
  return selectedRarities.length === 0 || selectedRarities.some((rarity) => rarity === cardRarity);
}

export function matchesTraitOrAttributeFilter(
  card: Pick<CardDefinition, "forms" | "types" | "attributes">,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [...(card.forms ?? []), ...(card.types ?? []), ...(card.attributes ?? [])].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

export type CardSearchMatch = "name" | "text" | "none";

interface CardSearchIndex {
  identity: string;
  text: string;
}

const searchIndexByCard = new WeakMap<CardDefinition, CardSearchIndex>();

const TEXT_FIELD_SEPARATOR = "\u0000";

/** Folds full-width characters, case, and keyword brackets so "royal knight" matches "[Royal Knight]". */
function normalizeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[[\]<>{}【】《》「」]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Built once per card and cached, since the filter reruns over the whole catalog on every keystroke. */
function searchIndexFor(card: CardDefinition): CardSearchIndex {
  const cached = searchIndexByCard.get(card);
  if (cached) return cached;
  const textFields = [
    card.effectText,
    card.inheritedEffectText,
    card.securityEffectText,
    card.optionEffect,
    card.dualEffect,
    card.linkEffect,
    card.linkRequirement,
  ].filter((field): field is string => Boolean(field));
  const index = {
    identity: normalizeSearchText(`${card.nameEn}${TEXT_FIELD_SEPARATOR}${card.cardId}`),
    text: normalizeSearchText(textFields.join(TEXT_FIELD_SEPARATOR)),
  };
  searchIndexByCard.set(card, index);
  return index;
}

export function cardSearchMatch(card: CardDefinition, query: string): CardSearchMatch {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return "name";
  const index = searchIndexFor(card);
  if (index.identity.includes(normalizedQuery)) return "name";
  if (index.text.includes(normalizedQuery)) return "text";
  return "none";
}

/** Sorts each match group on its own so cards found by name stay ahead of cards found only by their text. */
export function sortSearchResults({
  cards,
  sort,
  query,
}: {
  cards: readonly CardDefinition[];
  sort: CardSort;
  query: string;
}): CardDefinition[] {
  const nameMatches = cards.filter((card) => cardSearchMatch(card, query) === "name");
  const textMatches = cards.filter((card) => cardSearchMatch(card, query) === "text");
  return [...sortCards(nameMatches, sort), ...sortCards(textMatches, sort)];
}

export interface CardFilter {
  query: string;
  setQuery: (v: string) => void;
  colors: ColorName[];
  kinds: KindFilter[];
  levels: LevelFilter[];
  costs: CostFilter[];
  rarities: RarityFilter[];
  sort: CardSort;
  traitQuery: string;
  setTraitQuery: (v: string) => void;
  set: string;
  setSet: (v: string) => void;
  availableSets: string[];
  filtered: CardDefinition[];
  toggleColor: (v: ColorName) => void;
  toggleKind: (v: KindFilter) => void;
  toggleLevel: (v: LevelFilter) => void;
  toggleCost: (v: CostFilter) => void;
  toggleRarity: (v: RarityFilter) => void;
  setSort: (v: CardSort) => void;
  clear: () => void;
}

/** Search + color + kind + level + trait/attribute + set filter state over a card list. */
export function useCardFilter(
  all: readonly CardDefinition[],
  {
    colorFilterMode = "any",
    savedSort,
  }: {
    colorFilterMode?: ColorFilterMode;
    /** Keeps the sort in a store owned by the caller, such as a saved preference. */
    savedSort?: { sort: CardSort; setSort: (sort: CardSort) => void };
  } = {},
): CardFilter {
  const [query, setQuery] = useState("");
  const [colors, setColors] = useState<ColorName[]>([]);
  const [kinds, setKinds] = useState<KindFilter[]>([]);
  const [levels, setLevels] = useState<LevelFilter[]>([]);
  const [costs, setCosts] = useState<CostFilter[]>([]);
  const [rarities, setRarities] = useState<RarityFilter[]>([]);
  const [localSort, setLocalSort] = useState<CardSort>("releaseDate");
  const sort = savedSort?.sort ?? localSort;
  const setSort = savedSort?.setSort ?? setLocalSort;
  const [traitQuery, setTraitQuery] = useState("");
  const [set, setSet] = useState("");

  const availableSets = useMemo(() => {
    const seen = new Set<string>();
    for (const c of all) seen.add(c.set);
    return [...seen].sort((a, b) => collectionOrder(a) - collectionOrder(b));
  }, [all]);

  const filtered = useMemo(() => {
    const textMatches: CardDefinition[] = [];
    const nameMatches = all.filter((c) => {
      const searchMatch = cardSearchMatch(c, query);
      if (searchMatch === "none") return false;
      if (!matchesColorFilter({ cardColors: c.colors, selectedColors: colors, mode: colorFilterMode })) return false;
      if (kinds.length && !kinds.includes(kindOf(c) as KindFilter)) return false;
      if (!matchesLevelFilter(c.level, levels)) return false;
      if (!matchesCostFilter(c.playCost, costs)) return false;
      if (!matchesRarityFilter(c.rarity, rarities)) return false;
      if (!matchesTraitOrAttributeFilter(c, traitQuery)) return false;
      if (set && c.set !== set) return false;
      if (searchMatch === "text") {
        textMatches.push(c);
        return false;
      }
      return true;
    });
    return [...nameMatches, ...textMatches];
  }, [all, query, colors, kinds, levels, costs, rarities, traitQuery, set, colorFilterMode]);

  return {
    query,
    setQuery,
    colors,
    kinds,
    levels,
    costs,
    rarities,
    sort,
    traitQuery,
    setTraitQuery,
    set,
    setSet,
    availableSets,
    filtered,
    toggleColor: (v) => setColors((cs) => (cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v])),
    toggleKind: (v) => setKinds((ks) => (ks.includes(v) ? ks.filter((x) => x !== v) : [...ks, v])),
    toggleLevel: (v) => setLevels((ls) => (ls.includes(v) ? ls.filter((x) => x !== v) : [...ls, v])),
    toggleCost: (v) => setCosts((cs) => (cs.includes(v) ? cs.filter((x) => x !== v) : [...cs, v])),
    toggleRarity: (v) => setRarities((rs) => (rs.includes(v) ? rs.filter((x) => x !== v) : [...rs, v])),
    setSort,
    clear: () => {
      setQuery("");
      setColors([]);
      setKinds([]);
      setLevels([]);
      setCosts([]);
      setRarities([]);
      setTraitQuery("");
      setSet("");
    },
  };
}
