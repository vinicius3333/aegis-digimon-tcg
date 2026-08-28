import { getCardDefinition } from "../cards/registry.js";
import { CardColor } from "../schema/enums.js";
import { defineMetaDeck, type DeckEntry, type FamousDeck } from "./types.js";

/** One stored card line: a card id with the copy count played. */
export interface CatalogEntry {
  cardId: string;
  name: string;
  qty: number;
  type: string;
}

/** The event a tournament result was played at. */
export interface CatalogTournament {
  name: string;
  date: string;
  region: string;
  placement: number;
  player: string;
  location?: string;
  organizer?: string;
  eventFormat?: string;
  participants?: number;
  record?: string;
}

/** The single stored shape every deck in `data/<collection>.json` follows. */
export interface CatalogDeck {
  id: string;
  revision: number;
  name: string;
  archetype: string;
  collection: string;
  formatBlock: string;
  colors: string[];
  sourceType: "community_tournament_deck" | "product_recipe";
  approximation?: string;
  tournament?: CatalogTournament;
  mainDeck: CatalogEntry[];
  eggDeck: CatalogEntry[];
}

export interface CatalogFile {
  collection: string;
  generatedAt: string;
  decks: CatalogDeck[];
}

const knownColors = new Set<string>(Object.values(CardColor));

function catalogColor(color: string): CardColor {
  if (!knownColors.has(color)) throw new Error(`Unknown deck color: ${color}`);
  return color as CardColor;
}

function catalogEntries(entries: readonly CatalogEntry[]): DeckEntry[] {
  return entries.map(({ cardId, qty }) => ({ cardId, count: qty }));
}

function entriesAreValid(entries: unknown): entries is CatalogEntry[] {
  return (
    Array.isArray(entries) &&
    entries.every(
      (entry) =>
        !!entry &&
        typeof entry === "object" &&
        typeof (entry as CatalogEntry).cardId === "string" &&
        Number.isInteger((entry as CatalogEntry).qty) &&
        (entry as CatalogEntry).qty > 0,
    )
  );
}

function assertCatalogDeck(value: unknown): asserts value is CatalogDeck {
  const deck = value as Partial<CatalogDeck>;
  if (
    !deck ||
    typeof deck !== "object" ||
    typeof deck.id !== "string" ||
    typeof deck.name !== "string" ||
    typeof deck.archetype !== "string" ||
    typeof deck.collection !== "string" ||
    typeof deck.formatBlock !== "string" ||
    (deck.sourceType !== "community_tournament_deck" && deck.sourceType !== "product_recipe") ||
    !Array.isArray(deck.colors) ||
    !entriesAreValid(deck.mainDeck) ||
    !entriesAreValid(deck.eggDeck)
  ) {
    throw new Error(`Invalid catalog deck: ${(value as Partial<CatalogDeck>)?.id ?? "unknown"}`);
  }
  if (deck.sourceType === "community_tournament_deck" && !deck.tournament) {
    throw new Error(`Tournament result without event details: ${deck.id}`);
  }
  assertPlayableComposition(deck as CatalogDeck);
}

function assertPlayableComposition(deck: CatalogDeck): void {
  const mainCount = deck.mainDeck.reduce((total, entry) => total + entry.qty, 0);
  const eggCount = deck.eggDeck.reduce((total, entry) => total + entry.qty, 0);
  const unknownCard = [...deck.mainDeck, ...deck.eggDeck].find((entry) => !getCardDefinition(entry.cardId));
  if (mainCount !== 50 || eggCount > 5 || unknownCard) {
    throw new Error(
      `Invalid deck composition: ${deck.id} (${mainCount} main, ${eggCount} egg, unknown ${unknownCard?.cardId ?? "none"})`,
    );
  }
}

function catalogSource(deck: CatalogDeck): string {
  if (!deck.tournament) return `Official recipe for ${deck.collection}.`;
  const event = deck.tournament;
  const where = event.location ? `, ${event.location}` : "";
  return `${event.player}, #${event.placement} at ${event.name} (${event.date}, ${event.region}${where}).`;
}

/** Reads one stored deck into the runtime recipe shape shared by the client and the bots. */
export function catalogDeck(value: unknown): FamousDeck {
  assertCatalogDeck(value);
  return defineMetaDeck({
    deckId: value.id,
    revision: value.revision,
    name: value.name,
    block: value.collection,
    anchorProduct: value.collection,
    archetype: value.archetype,
    colors: value.colors.map(catalogColor),
    source: catalogSource(value),
    sourceType: value.sourceType,
    category: value.sourceType === "product_recipe" ? "official-recipe" : "tournament-result",
    approximation: value.approximation,
    mainDeck: catalogEntries(value.mainDeck),
    eggDeck: catalogEntries(value.eggDeck),
  });
}
