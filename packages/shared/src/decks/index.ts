import { CARD_POOL_CUTOFF_DATE, isCardInActivePool, releaseDateForSet } from "../cards/cardPool.js";
import { getCardDefinition } from "../cards/registry.js";
import { CardColor } from "../schema/enums.js";
import importedCatalog from "./data/deck-lists.json" with { type: "json" };
import communityTournamentCatalog from "./data/community-tournament-decks.json" with { type: "json" };
import moreCommunityTournamentCatalog from "./data/community-tournament-decks-more.json" with { type: "json" };
import diversifiedCommunityTournamentCatalog from "./data/community-tournament-decks-more-2.json" with { type: "json" };
import activePoolCommunityTournamentCatalog from "./data/community-tournament-decks-bt10-backfill.json" with { type: "json" };
import recentCommunityTournamentCatalog1 from "./data/community-tournament-decks-bt17-bt25-1.json" with { type: "json" };
import recentCommunityTournamentCatalog2 from "./data/community-tournament-decks-bt17-bt25-2.json" with { type: "json" };
import officialProductCatalog from "./data/official-product-decks.json" with { type: "json" };
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
import { defineMetaDeck, type DeckEntry, type FamousDeck } from "./types.js";

export type FamousDeckCutoffDate = `${number}-${number}-${number}`;

/** Every sourced deck recipe, including entries ahead of the operational pool. */
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

interface ImportedEntry {
  cardId: string;
  qty: number;
}

interface ImportedTournament {
  name: string;
  organizer: string;
  date: string;
  placement: number;
  player: string;
  location: string;
}

interface ImportedDeck {
  id: string;
  name?: string;
  archetype: string;
  colors: string[];
  set: string;
  source?: string;
  tournament?: ImportedTournament;
  mainDeck: ImportedEntry[];
  eggDeck: ImportedEntry[];
}

interface OfficialProductDeck {
  id: string;
  name: string;
  archetype: string;
  colors: string[];
  anchorProduct: string;
  sourceType: "product_recipe";
  provenance: { publisher: string; sourceUrl: string; retrievedAt: string };
  mainDeck: ImportedEntry[];
  eggDeck: ImportedEntry[];
}

interface CommunityTournamentDeck {
  id: string;
  revision?: number;
  name: string;
  archetype: string;
  approximation?: string;
  colors: string[];
  anchorProduct: string;
  sourceType: "community_tournament_deck";
  tournament: {
    name: string;
    date: string;
    region: string;
    placement: number;
    player: string;
    participants?: number;
    record?: string;
  };
  provenance: {
    sourcePublisher: string;
    sourceUrl: string;
    contextPublisher?: string;
    contextUrl?: string;
  };
  mainDeck: ImportedEntry[];
  eggDeck: ImportedEntry[];
}

const knownColors = new Set<string>(Object.values(CardColor));

function importedColor(color: string): CardColor {
  if (!knownColors.has(color)) throw new Error(`Unknown imported deck color: ${color}`);
  return color as CardColor;
}

function importedEntries(entries: readonly ImportedEntry[]): DeckEntry[] {
  return entries.map(({ cardId, qty }) => ({ cardId, count: qty }));
}

function importedSource(deck: ImportedDeck): string {
  if (!deck.tournament) return `Official ${deck.source ?? "Bandai"} deck recipe for ${deck.set}.`;
  const event = deck.tournament;
  return `${event.name}, ${event.date}: #${event.placement} ${event.player} (${event.organizer}, ${event.location}). Archived by ${importedCatalog.source}.`;
}

function importedDeck(value: unknown): ImportedDeck {
  if (!value || typeof value !== "object") throw new Error("Imported deck must be an object");
  const deck = value as Partial<ImportedDeck>;
  const entriesAreValid = (entries: unknown): entries is ImportedEntry[] =>
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as ImportedEntry).cardId === "string" &&
        Number.isInteger((entry as ImportedEntry).qty) &&
        (entry as ImportedEntry).qty > 0,
    );
  if (
    typeof deck.id !== "string" ||
    typeof deck.archetype !== "string" ||
    typeof deck.set !== "string" ||
    !Array.isArray(deck.colors) ||
    !deck.colors.every((color) => typeof color === "string") ||
    !entriesAreValid(deck.mainDeck) ||
    !entriesAreValid(deck.eggDeck)
  ) {
    throw new Error(`Invalid imported deck: ${deck.id ?? "unknown"}`);
  }
  return deck as ImportedDeck;
}

function defineImportedDeck(value: unknown): FamousDeck {
  const deck = importedDeck(value);
  return defineMetaDeck({
    deckId: deck.id,
    revision: 1,
    name: deck.name ?? deck.archetype,
    block: deck.set,
    archetype: deck.archetype,
    colors: deck.colors.map(importedColor),
    source: importedSource(deck),
    category: deck.tournament ? "tournament-result" : "official-recipe",
    mainDeck: importedEntries(deck.mainDeck),
    eggDeck: importedEntries(deck.eggDeck),
  });
}

function officialProductDeck(value: unknown): FamousDeck {
  if (!value || typeof value !== "object") throw new Error("Official product deck must be an object");
  const deck = value as Partial<OfficialProductDeck>;
  if (
    typeof deck.id !== "string" ||
    typeof deck.name !== "string" ||
    typeof deck.archetype !== "string" ||
    typeof deck.anchorProduct !== "string" ||
    deck.sourceType !== "product_recipe" ||
    !deck.provenance ||
    typeof deck.provenance.sourceUrl !== "string" ||
    !Array.isArray(deck.colors) ||
    !Array.isArray(deck.mainDeck) ||
    !Array.isArray(deck.eggDeck)
  ) {
    throw new Error(`Invalid official product deck: ${deck.id ?? "unknown"}`);
  }
  const mainDeck = importedEntries(deck.mainDeck);
  const eggDeck = importedEntries(deck.eggDeck);
  const mainCount = mainDeck.reduce((total, entry) => total + entry.count, 0);
  const eggCount = eggDeck.reduce((total, entry) => total + entry.count, 0);
  const unknownCard = [...mainDeck, ...eggDeck].find((entry) => !getCardDefinition(entry.cardId));
  if (mainCount !== 50 || eggCount > 5 || unknownCard) {
    throw new Error(
      `Invalid official product deck composition: ${deck.id} (${mainCount} main, ${eggCount} egg, unknown ${unknownCard?.cardId ?? "none"})`,
    );
  }
  return defineMetaDeck({
    deckId: deck.id,
    revision: 1,
    name: deck.name,
    block: deck.anchorProduct,
    anchorProduct: deck.anchorProduct,
    archetype: deck.archetype,
    colors: deck.colors.map(importedColor),
    source: `${deck.provenance.publisher} official recipe for ${deck.anchorProduct}, retrieved ${deck.provenance.retrievedAt}.`,
    sourceUrl: deck.provenance.sourceUrl,
    sourceType: deck.sourceType,
    category: "official-recipe",
    mainDeck,
    eggDeck,
  });
}

function communityTournamentDeck(value: unknown): FamousDeck {
  if (!value || typeof value !== "object") throw new Error("Community tournament deck must be an object");
  const deck = value as Partial<CommunityTournamentDeck>;
  if (
    typeof deck.id !== "string" ||
    typeof deck.name !== "string" ||
    typeof deck.archetype !== "string" ||
    typeof deck.anchorProduct !== "string" ||
    deck.sourceType !== "community_tournament_deck" ||
    !deck.tournament ||
    !deck.provenance ||
    typeof deck.provenance.sourceUrl !== "string" ||
    !Array.isArray(deck.colors) ||
    !Array.isArray(deck.mainDeck) ||
    !Array.isArray(deck.eggDeck)
  ) {
    throw new Error(`Invalid community tournament deck: ${deck.id ?? "unknown"}`);
  }
  const mainDeck = importedEntries(deck.mainDeck);
  const eggDeck = importedEntries(deck.eggDeck);
  const mainCount = mainDeck.reduce((total, entry) => total + entry.count, 0);
  const eggCount = eggDeck.reduce((total, entry) => total + entry.count, 0);
  const unknownCard = [...mainDeck, ...eggDeck].find((entry) => !getCardDefinition(entry.cardId));
  if (mainCount !== 50 || eggCount > 5 || unknownCard) {
    throw new Error(
      `Invalid community tournament deck composition: ${deck.id} (${mainCount} main, ${eggCount} egg, unknown ${unknownCard?.cardId ?? "none"})`,
    );
  }
  const event = deck.tournament;
  return defineMetaDeck({
    deckId: deck.id,
    revision: deck.revision ?? 1,
    name: deck.name,
    block: deck.anchorProduct,
    anchorProduct: deck.anchorProduct,
    archetype: deck.archetype,
    colors: deck.colors.map(importedColor),
    source: `${event.player}, #${event.placement} at ${event.name} (${event.date}, ${event.region}). Archived by ${deck.provenance.sourcePublisher}.`,
    sourceUrl: deck.provenance.sourceUrl,
    sourceType: deck.sourceType,
    category: "tournament-result",
    approximation: deck.approximation,
    mainDeck,
    eggDeck,
  });
}

/** Previously collected future recipes; availability is still governed card by card. */
export const IMPORTED_FAMOUS_DECKS: readonly FamousDeck[] = Object.freeze(
  [...importedCatalog.basicDecks, ...importedCatalog.metaDecks].map(defineImportedDeck),
);

/** Complete recipes published on official Bandai product pages. */
export const OFFICIAL_PRODUCT_DECKS: readonly FamousDeck[] = Object.freeze(
  officialProductCatalog.decks.map(officialProductDeck),
);

/** Competitive results transcribed from community tournament archives. */
export const COMMUNITY_TOURNAMENT_DECKS: readonly FamousDeck[] = Object.freeze(
  [
    ...communityTournamentCatalog.decks,
    ...moreCommunityTournamentCatalog.decks,
    ...diversifiedCommunityTournamentCatalog.decks,
    ...activePoolCommunityTournamentCatalog.decks,
    ...recentCommunityTournamentCatalog1.decks,
    ...recentCommunityTournamentCatalog2.decks,
  ].map(communityTournamentDeck),
);

/** Every sourced deck recipe, including entries ahead of the operational pool. */
export const ALL_FAMOUS_DECKS: readonly FamousDeck[] = Object.freeze([
  ...VALIDATED_FAMOUS_DECKS,
  ...IMPORTED_FAMOUS_DECKS,
  ...OFFICIAL_PRODUCT_DECKS,
  ...ADDITIONAL_COLLECTION_DECKS,
  ...COMMUNITY_TOURNAMENT_DECKS,
]);

/** Finds a catalog preset by its stable identifier. */
export function famousDeckById(
  deckId: string,
  decks: readonly FamousDeck[] = ALL_FAMOUS_DECKS,
): FamousDeck | undefined {
  return decks.find((deck) => deck.deckId === deckId);
}

/** A deck is exposed only when every card exists and belongs to the requested pool. */
export function isFamousDeckAvailable(
  deck: FamousDeck,
  cutoffDate: FamousDeckCutoffDate = CARD_POOL_CUTOFF_DATE,
): boolean {
  const formatReleaseDate = releaseDateForSet(deck.anchorProduct ?? deck.block);
  if (formatReleaseDate && formatReleaseDate > cutoffDate) return false;
  return [...deck.decklist.mainDeck, ...deck.decklist.eggDeck].every((cardId) => {
    const definition = getCardDefinition(cardId);
    return definition !== undefined && isCardInActivePool(definition, cutoffDate);
  });
}

export interface FamousDeckGroup {
  collection: string;
  decks: readonly FamousDeck[];
}

/** Available deck recipes grouped from the most recent format collection to the oldest. */
export function famousDeckGroups(
  decks: readonly FamousDeck[] = ALL_FAMOUS_DECKS,
  cutoffDate: FamousDeckCutoffDate = CARD_POOL_CUTOFF_DATE,
): FamousDeckGroup[] {
  const byCollection = new Map<string, FamousDeck[]>();
  for (const deck of decks) {
    if (!isFamousDeckAvailable(deck, cutoffDate)) continue;
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
export { ADDITIONAL_COLLECTION_DECKS } from "./additionalCollections.js";
