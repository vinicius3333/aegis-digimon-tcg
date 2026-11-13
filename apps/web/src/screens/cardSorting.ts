/* Card ordering — collection order (set, then number) and the sorts the library offers. */

import { allProductLabels, releaseDateForCard, releaseDateForSet, type CardDefinition } from "@aegis/shared";
import { appOnlySets } from "@aegis/shared/cards/appOnlySets";
import { kindOf } from "../design/theme";
import { CardSort } from "./cardFilters";

const setLabelCollator = new Intl.Collator("en", { numeric: true });

const datedSetsOldestFirst = allProductLabels().sort(
  (a, b) => (releaseDateForSet(a) ?? "").localeCompare(releaseDateForSet(b) ?? "") || setLabelCollator.compare(a, b),
);

const SET_RELEASE_ORDER: ReadonlyMap<string, number> = new Map(
  [...datedSetsOldestFirst, ...appOnlySets].map((set, index) => [set, index + 1]),
);

const MISC_SETS: Record<string, number> = { LM: 1, P: 2 };

// Approximate EN release year per promo (set "P"), keyed by the highest P-NNN of
// each year's wave. Boundaries are derived from which promo pack contains each
// range (Bandai does not publish a per-card release date), so edges are fuzzy.
// Anchors: Promotion Pack Ver.0.0 = 2021 launch; 1st Anniversary = 2022;
// 3rd Anniversary Update Pack (BT-13) = 2023; Adventure 02 + Update Pack (BT-17)
// = 2024; Tamer Battle Pack 26 = Jan 2025.
const PROMO_YEAR_BANDS: ReadonlyArray<readonly [maxNumber: number, year: number]> = [
  [28, 2021],
  [90, 2022],
  [116, 2023],
  [142, 2024],
  [Infinity, 2025],
];

function promoYear(cardId: string): number {
  const n = cardNumber(cardId);
  return (PROMO_YEAR_BANDS.find(([max]) => n <= max) ?? [0, 2025])[1];
}

export function collectionOrder(set: string): number {
  const s = set.toUpperCase();
  const order = SET_RELEASE_ORDER.get(s);
  if (order !== undefined) return -order;
  const misc = MISC_SETS[s];
  return misc !== undefined ? 900000 + misc : 999999;
}

function cardNumber(cardId: string): number {
  const dash = cardId.lastIndexOf("-");
  return dash > 0 ? parseInt(cardId.slice(dash + 1), 10) : 0;
}

// Within a collection group, promos cluster newest-year-first; everything else
// keeps ascending card number.
function withinCollectionOrder(idA: string, setA: string, idB: string, setB: string): number {
  if (setA.toUpperCase() === "P" && setB.toUpperCase() === "P") {
    const yearDiff = promoYear(idB) - promoYear(idA);
    if (yearDiff !== 0) return yearDiff;
  }
  return cardNumber(idA) - cardNumber(idB);
}

export function sortByCollection(cards: readonly CardDefinition[]): CardDefinition[] {
  return [...cards].sort((a, b) => {
    const diff = collectionOrder(a.set) - collectionOrder(b.set);
    if (diff !== 0) return diff;
    return withinCollectionOrder(a.cardId, a.set, b.cardId, b.set);
  });
}

function compareNumbers(a: number | undefined, b: number | undefined): number {
  return (a ?? Infinity) - (b ?? Infinity);
}

/** Sorts the card pool for browsing; random order is reshuffled when selected. */
export function sortCards(cards: readonly CardDefinition[], sort: CardSort): CardDefinition[] {
  const sorted = [...cards];
  if (sort === "random") {
    for (let i = sorted.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [sorted[i], sorted[j]] = [sorted[j]!, sorted[i]!];
    }
    return sorted;
  }
  return sorted.sort((a, b) => {
    if (sort === "releaseDate") {
      const dateOrder = (releaseDateForCard(b) ?? "").localeCompare(releaseDateForCard(a) ?? "");
      return dateOrder || a.cardId.localeCompare(b.cardId, undefined, { numeric: true });
    }
    if (sort === "dp") return compareNumbers(a.dp, b.dp) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "level") return compareNumbers(a.level, b.level) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "playCost") return compareNumbers(a.playCost, b.playCost) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "type") return kindOf(a).localeCompare(kindOf(b)) || a.nameEn.localeCompare(b.nameEn);
    if (sort === "cardNumber") return a.cardId.localeCompare(b.cardId, undefined, { numeric: true });
    return a.nameEn.localeCompare(b.nameEn);
  });
}

export function sortCardIds(ids: string[]): string[] {
  return [...ids].sort((a, b) => {
    const setA = a.split("-")[0] ?? "";
    const setB = b.split("-")[0] ?? "";
    const diff = collectionOrder(setA) - collectionOrder(setB);
    if (diff !== 0) return diff;
    return withinCollectionOrder(a, setA, b, setB);
  });
}
