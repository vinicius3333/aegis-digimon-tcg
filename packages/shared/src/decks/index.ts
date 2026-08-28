import { releaseDateForSet } from "../cards/cardPool.js";
import { isBanned } from "../banlist.js";
import { getCardDefinition } from "../cards/registry.js";
import { catalogDeck, type CatalogFile } from "./catalogSchema.js";
import bt4Catalog from "./data/bt4.json" with { type: "json" };
import bt7Catalog from "./data/bt7.json" with { type: "json" };
import bt8Catalog from "./data/bt8.json" with { type: "json" };
import bt9Catalog from "./data/bt9.json" with { type: "json" };
import bt10Catalog from "./data/bt10.json" with { type: "json" };
import bt11Catalog from "./data/bt11.json" with { type: "json" };
import bt12Catalog from "./data/bt12.json" with { type: "json" };
import bt13Catalog from "./data/bt13.json" with { type: "json" };
import bt14Catalog from "./data/bt14.json" with { type: "json" };
import bt15Catalog from "./data/bt15.json" with { type: "json" };
import bt16Catalog from "./data/bt16.json" with { type: "json" };
import bt17Catalog from "./data/bt17.json" with { type: "json" };
import bt18Catalog from "./data/bt18.json" with { type: "json" };
import bt19Catalog from "./data/bt19.json" with { type: "json" };
import bt20Catalog from "./data/bt20.json" with { type: "json" };
import bt21Catalog from "./data/bt21.json" with { type: "json" };
import bt22Catalog from "./data/bt22.json" with { type: "json" };
import bt23Catalog from "./data/bt23.json" with { type: "json" };
import bt24Catalog from "./data/bt24.json" with { type: "json" };
import bt25Catalog from "./data/bt25.json" with { type: "json" };
import ex3Catalog from "./data/ex3.json" with { type: "json" };
import ex4Catalog from "./data/ex4.json" with { type: "json" };
import ex5Catalog from "./data/ex5.json" with { type: "json" };
import ex6Catalog from "./data/ex6.json" with { type: "json" };
import ex7Catalog from "./data/ex7.json" with { type: "json" };
import ex8Catalog from "./data/ex8.json" with { type: "json" };
import ex9Catalog from "./data/ex9.json" with { type: "json" };
import ex10Catalog from "./data/ex10.json" with { type: "json" };
import ex11Catalog from "./data/ex11.json" with { type: "json" };
import ex12Catalog from "./data/ex12.json" with { type: "json" };
import rb1Catalog from "./data/rb1.json" with { type: "json" };
import ad1Catalog from "./data/ad1.json" with { type: "json" };
import { BT1_DECKS } from "./bt1.js";
import { BT2_DECKS } from "./bt2.js";
import { BT3_DECKS } from "./bt3.js";
import { BT4_DECKS } from "./bt4.js";
import { BT5_DECKS } from "./bt5.js";
import { BT6_DECKS } from "./bt6.js";
import { EX1_DECKS } from "./ex1.js";
import { BT7_DECKS } from "./bt7.js";
import { BT8_DECKS } from "./bt8.js";
import { BT9_DECKS } from "./bt9.js";
import { BT10_DECKS } from "./bt10.js";
import { ADDITIONAL_COLLECTION_DECKS } from "./additionalCollections.js";
import type { FamousDeck } from "./types.js";

/** Hand-authored recipes that predate the stored catalog format. */
export const VALIDATED_FAMOUS_DECKS: readonly FamousDeck[] = Object.freeze([
  ...BT1_DECKS,
  ...BT2_DECKS,
  ...BT3_DECKS,
  ...BT4_DECKS,
  ...BT5_DECKS,
  ...BT6_DECKS,
  ...EX1_DECKS,
  ...BT7_DECKS,
  ...BT8_DECKS,
  ...BT9_DECKS,
  ...BT10_DECKS,
]);

/** One stored file per collection, oldest collection first. */
const CATALOG_FILES: readonly CatalogFile[] = [
  bt4Catalog,
  bt7Catalog,
  bt8Catalog,
  bt9Catalog,
  bt10Catalog,
  bt11Catalog,
  bt12Catalog,
  bt13Catalog,
  bt14Catalog,
  bt15Catalog,
  bt16Catalog,
  bt17Catalog,
  bt18Catalog,
  bt19Catalog,
  bt20Catalog,
  bt21Catalog,
  bt22Catalog,
  bt23Catalog,
  bt24Catalog,
  bt25Catalog,
  ex3Catalog,
  ex4Catalog,
  ex5Catalog,
  ex6Catalog,
  ex7Catalog,
  ex8Catalog,
  ex9Catalog,
  ex10Catalog,
  ex11Catalog,
  ex12Catalog,
  rb1Catalog,
  ad1Catalog,
] as CatalogFile[];

/** Every deck stored in `data/`, in collection order. */
export const CATALOG_DECKS: readonly FamousDeck[] = Object.freeze(
  CATALOG_FILES.flatMap((file) => file.decks.map(catalogDeck)),
);

/** Complete recipes published on official Bandai product pages. */
export const OFFICIAL_PRODUCT_DECKS: readonly FamousDeck[] = Object.freeze(
  CATALOG_DECKS.filter((deck) => deck.sourceType === "product_recipe"),
);

/** Competitive results transcribed from community tournament archives. */
export const COMMUNITY_TOURNAMENT_DECKS: readonly FamousDeck[] = Object.freeze(
  CATALOG_DECKS.filter((deck) => deck.sourceType === "community_tournament_deck"),
);

/** Every sourced deck recipe, including entries ahead of the operational pool. */
export const ALL_FAMOUS_DECKS: readonly FamousDeck[] = Object.freeze([
  ...VALIDATED_FAMOUS_DECKS,
  ...ADDITIONAL_COLLECTION_DECKS,
  ...CATALOG_DECKS,
]);

/** Finds a catalog preset by its stable identifier. */
export function famousDeckById(
  deckId: string,
  decks: readonly FamousDeck[] = ALL_FAMOUS_DECKS,
): FamousDeck | undefined {
  return decks.find((deck) => deck.deckId === deckId);
}

/**
 * A deck is exposed only when every card exists and is still legal. A recipe built around a
 * card the current banlist forbids outright cannot be adapted by trimming copies, so it is
 * withheld rather than offered as an unplayable preset.
 */
export function isFamousDeckAvailable(deck: FamousDeck): boolean {
  return [...deck.decklist.mainDeck, ...deck.decklist.eggDeck].every((cardId) => {
    return getCardDefinition(cardId) !== undefined && !isBanned(cardId);
  });
}

export interface FamousDeckGroup {
  collection: string;
  decks: readonly FamousDeck[];
}

/** Available deck recipes grouped from the most recent format collection to the oldest. */
export function famousDeckGroups(decks: readonly FamousDeck[] = ALL_FAMOUS_DECKS): FamousDeckGroup[] {
  const byCollection = new Map<string, FamousDeck[]>();
  for (const deck of decks) {
    if (!isFamousDeckAvailable(deck)) continue;
    byCollection.set(deck.block, [...(byCollection.get(deck.block) ?? []), deck]);
  }
  return [...byCollection.entries()]
    .sort(([left], [right]) => {
      const leftDate = releaseDateForSet(left) ?? "";
      const rightDate = releaseDateForSet(right) ?? "";
      return leftDate === rightDate ? right.localeCompare(left) : rightDate.localeCompare(leftDate);
    })
    .map(([collection, collectionDecks]) => ({ collection, decks: Object.freeze(collectionDecks) }));
}

export * from "./types.js";
export type { CatalogDeck, CatalogEntry, CatalogFile, CatalogTournament } from "./catalogSchema.js";
export { ADDITIONAL_COLLECTION_DECKS } from "./additionalCollections.js";
