/* The card-pool filter: what can be filtered on, whether a card passes, and the hook
   that holds a screen's current selection. */

import { useMemo, useState } from "react";
import { type CardColor, type CardDefinition } from "@aegis/shared";
import { colorKey, kindOf, type ColorName } from "../design/theme";
import { collectionOrder } from "./cardSorting";

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
  card: Pick<CardDefinition, "types" | "attributes">,
  query: string,
): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return [...(card.types ?? []), ...(card.attributes ?? [])].some((value) =>
    value.toLowerCase().includes(normalizedQuery),
  );
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
  { colorFilterMode = "any" }: { colorFilterMode?: ColorFilterMode } = {},
): CardFilter {
  const [query, setQuery] = useState("");
  const [colors, setColors] = useState<ColorName[]>([]);
  const [kinds, setKinds] = useState<KindFilter[]>([]);
  const [levels, setLevels] = useState<LevelFilter[]>([]);
  const [costs, setCosts] = useState<CostFilter[]>([]);
  const [rarities, setRarities] = useState<RarityFilter[]>([]);
  const [sort, setSort] = useState<CardSort>("releaseDate");
  const [traitQuery, setTraitQuery] = useState("");
  const [set, setSet] = useState("");

  const availableSets = useMemo(() => {
    const seen = new Set<string>();
    for (const c of all) seen.add(c.set);
    return [...seen].sort((a, b) => collectionOrder(a) - collectionOrder(b));
  }, [all]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((c) => {
      if (q && !c.nameEn.toLowerCase().includes(q) && !c.cardId.toLowerCase().includes(q)) return false;
      if (!matchesColorFilter({ cardColors: c.colors, selectedColors: colors, mode: colorFilterMode })) return false;
      if (kinds.length && !kinds.includes(kindOf(c) as KindFilter)) return false;
      if (!matchesLevelFilter(c.level, levels)) return false;
      if (!matchesCostFilter(c.playCost, costs)) return false;
      if (!matchesRarityFilter(c.rarity, rarities)) return false;
      if (!matchesTraitOrAttributeFilter(c, traitQuery)) return false;
      if (set && c.set !== set) return false;
      return true;
    });
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
