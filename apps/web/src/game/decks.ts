/* Selectable starter decks for the lobby. These mirror the api's own legal-shaped
   test decks (apps/api/src/engine/testDecks.ts) by card id — the web package may
   not import @aegis/api, so the lists are restated here. Both are 50 main + 5 egg,
   built from real BT1 cards so a joined match can actually be dealt and played. */

import {
  allCards,
  famousDeckGroups,
  getCardDefinition,
  isCardInActivePool,
  effectiveCopyLimit as banlistLimit,
  type CardDefinition,
  type FamousDeck,
} from "@aegis/shared";
import { colorKey, kindOf, type ColorName } from "../design/theme";
import type { Translate, TranslationKey } from "../i18n";

interface CardEntry {
  cardId: string;
  count: number;
}

function expand(entries: readonly CardEntry[]): string[] {
  const cards: string[] = [];
  for (const { cardId, count } of entries) {
    for (let copy = 0; copy < count; copy += 1) cards.push(cardId);
  }
  return cards;
}

const RED_MAIN: readonly CardEntry[] = [
  { cardId: "BT1-009", count: 4 },
  { cardId: "BT1-010", count: 4 },
  { cardId: "BT1-011", count: 4 },
  { cardId: "BT1-012", count: 4 },
  { cardId: "BT1-013", count: 4 },
  { cardId: "BT1-014", count: 4 },
  { cardId: "BT1-015", count: 4 },
  { cardId: "BT1-016", count: 4 },
  { cardId: "BT1-020", count: 4 },
  { cardId: "BT1-021", count: 4 },
  { cardId: "BT1-025", count: 2 },
  { cardId: "BT1-017", count: 3 },
  { cardId: "BT1-085", count: 4 },
  { cardId: "BT1-090", count: 1 },
];
const RED_EGGS: readonly CardEntry[] = [
  { cardId: "BT1-001", count: 3 },
  { cardId: "BT1-002", count: 2 },
];

const BLUE_MAIN: readonly CardEntry[] = [
  { cardId: "BT1-027", count: 4 },
  { cardId: "BT1-028", count: 4 },
  { cardId: "BT1-029", count: 4 },
  { cardId: "BT1-030", count: 4 },
  { cardId: "BT1-031", count: 4 },
  { cardId: "BT1-032", count: 4 },
  { cardId: "BT1-033", count: 4 },
  { cardId: "BT1-034", count: 4 },
  { cardId: "BT1-038", count: 4 },
  { cardId: "BT1-039", count: 4 },
  { cardId: "BT1-043", count: 2 },
  { cardId: "BT1-086", count: 4 },
  { cardId: "BT1-096", count: 4 },
];
const BLUE_EGGS: readonly CardEntry[] = [
  { cardId: "BT1-003", count: 3 },
  { cardId: "BT1-004", count: 2 },
];

export interface DeckListing {
  id: string;
  name: string;
  color: ColorName;
  blurb: string;
  mainDeck: string[];
  eggDeck: string[];
  coverCardId?: string;
}

export interface FamousDeckListingGroup {
  collection: string;
  decks: readonly DeckListing[];
}

function famousDeckListing(deck: FamousDeck): DeckListing {
  const coverCardId = [...deck.decklist.mainDeck]
    .reverse()
    .find((cardId) => getCardDefinition(cardId)?.level !== undefined);
  return {
    id: deck.deckId,
    name: deck.archetype,
    color: colorKey(deck.colors[0]) as ColorName,
    blurb: `${deck.archetype} · ${deck.block}`,
    mainDeck: [...deck.decklist.mainDeck],
    eggDeck: [...deck.decklist.eggDeck],
    coverCardId,
  };
}

/** Immutable presets available under the operational card-pool cutoff. */
export const FAMOUS_DECK_GROUPS: readonly FamousDeckListingGroup[] = Object.freeze(
  famousDeckGroups().map((group) =>
    Object.freeze({ collection: group.collection, decks: Object.freeze(group.decks.map(famousDeckListing)) }),
  ),
);

export const FAMOUS_DECKS: readonly DeckListing[] = Object.freeze(FAMOUS_DECK_GROUPS.flatMap((group) => group.decks));

/** Personal decks followed by the immutable presets available for selection. */
export function selectableDecks(personalDecks: readonly DeckListing[]): DeckListing[] {
  return [...personalDecks, ...FAMOUS_DECKS];
}

/** Creates an editable personal copy without mutating or shadowing the preset. */
export function copyDeckPreset(preset: DeckListing, personalDecks: readonly DeckListing[]): DeckListing {
  const baseId = `copy-${preset.id}`;
  let id = baseId;
  let copy = 2;
  while (personalDecks.some((deck) => deck.id === id)) {
    id = `${baseId}-${copy}`;
    copy += 1;
  }
  return {
    ...preset,
    id,
    name: `${preset.name} (copy)`,
    mainDeck: [...preset.mainDeck],
    eggDeck: [...preset.eggDeck],
  };
}

/** Deckable cards only — drop synthetic tokens and zero-copy entries. */
export function isDeckable(def: CardDefinition): boolean {
  return !def.isToken && def.maxCountInDeck > 0;
}

/** The cards a player can actually browse and build with today. */
export function activeCollectionCards(): CardDefinition[] {
  return allCards().filter((card) => isDeckable(card) && isCardInActivePool(card));
}

/** Removes cards that are unavailable in the current release pool from a saved deck. */
export function filterDeckToActivePool(deck: DeckListing): DeckListing {
  const isActive = (cardId: string): boolean => {
    const definition = getCardDefinition(cardId);
    return !!definition && isCardInActivePool(definition);
  };
  const mainDeck = deck.mainDeck.filter(isActive);
  const eggDeck = deck.eggDeck.filter(isActive);
  const coverCardId = deck.coverCardId && isActive(deck.coverCardId) ? deck.coverCardId : undefined;
  return { ...deck, mainDeck, eggDeck, coverCardId };
}

/** Picks a random unique card from the main deck to use as the deck cover. */
export function randomCoverCard(mainDeck: readonly string[]): string | undefined {
  const unique = [...new Set(mainDeck)];
  if (unique.length === 0) return undefined;
  return unique[Math.floor(Math.random() * unique.length)];
}

/**
 * Returns the card to display as the deck cover. Uses the explicit choice when
 * set, otherwise falls back to the last unique card in the main deck (which by
 * insertion order is typically the highest-cost card in a sorted list).
 */
export function displayCoverCard(deck: DeckListing): string | undefined {
  if (deck.coverCardId) return deck.coverCardId;
  return [...new Set(deck.mainDeck)].at(-1);
}

export const STARTER_IDS: ReadonlySet<string> = new Set(["scarlet-roar", "tidewatch"]);

export const DECKS: DeckListing[] = [
  {
    id: "scarlet-roar",
    name: "Scarlet Roar",
    color: "Red",
    blurb: "deck.blurbStarterRed",
    mainDeck: expand(RED_MAIN),
    eggDeck: expand(RED_EGGS),
  },
  {
    id: "tidewatch",
    name: "Tidewatch",
    color: "Blue",
    blurb: "deck.blurbStarterBlue",
    mainDeck: expand(BLUE_MAIN),
    eggDeck: expand(BLUE_EGGS),
  },
];

/* Blurbs are persisted with decks, so older saves still carry the literal pt-BR
   sentences these keys replaced. Both spellings resolve to the same translation;
   anything else (famous-deck "archetype · block" lines) passes through as-is. */
const BLURB_KEYS: Record<string, TranslationKey> = {
  "deck.blurbSaved": "deck.blurbSaved",
  "deck.blurbStarterRed": "deck.blurbStarterRed",
  "deck.blurbStarterBlue": "deck.blurbStarterBlue",
  "deck.blurbNew": "deck.blurbNew",
  "Salvo na sua conta": "deck.blurbSaved",
  "Agressivo vermelho de BT1 — ocupe a mesa e avance na segurança com Greymon e WarGreymon.": "deck.blurbStarterRed",
  "Controle azul de BT1 — faça trocas eficientes e prepare a chegada de SaberLeomon.": "deck.blurbStarterBlue",
  "Um deck novo, pronto para você montar.": "deck.blurbNew",
};

export function deckBlurbLabel(t: Translate, blurb: string): string {
  const key = BLURB_KEYS[blurb];
  return key ? t(key) : blurb;
}

export function deckById(decks: readonly DeckListing[], id: string): DeckListing | undefined {
  return decks.find((d) => d.id === id) ?? decks[0];
}

/** The most common (non-neutral) color across a card list — a deck's accent. */
export function dominantColor(cardIds: readonly string[], fallback: ColorName = "Blue"): ColorName {
  const tally = new Map<ColorName, number>();
  for (const id of cardIds) {
    const def = getCardDefinition(id);
    if (!def) continue;
    for (const col of def.colors) {
      const key = colorKey(col);
      if (key === "Neutral") continue;
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  }
  let best = fallback;
  let bestCount = 0;
  for (const [key, count] of tally) {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  return best;
}

/** Insert or replace a deck by id, preserving order. */
export function upsertDeck(decks: readonly DeckListing[], deck: DeckListing): DeckListing[] {
  const index = decks.findIndex((d) => d.id === deck.id);
  if (index === -1) return [...decks, deck];
  const next = decks.slice();
  next[index] = deck;
  return next;
}

/** A fresh, empty deck with an id unique among `existing`. */
export function createBlankDeck(existing: readonly DeckListing[], color: ColorName = "Blue", name = "Novo deck"): DeckListing {
  let n = existing.length + 1;
  while (existing.some((d) => d.id === `custom-${n}`)) n += 1;
  return {
    id: `custom-${n}`,
    name,
    color,
    blurb: "deck.blurbNew",
    mainDeck: [],
    eggDeck: [],
  };
}

/** A short cost-curve summary (count of cards per play cost bucket) for the lobby. */
export function deckCurve(deck: DeckListing): { cost: number; count: number }[] {
  const buckets = new Map<number, number>();
  for (const cardId of deck.mainDeck) {
    const def = getCardDefinition(cardId);
    const cost = def && def.playCost >= 0 ? Math.min(def.playCost, 7) : 0;
    buckets.set(cost, (buckets.get(cost) ?? 0) + 1);
  }
  return [...buckets.entries()].sort((a, b) => a[0] - b[0]).map(([cost, count]) => ({ cost, count }));
}

/** Convenience: the palette key for a deck (always a valid ColorName). */
export function deckColorKey(deck: DeckListing): ColorName {
  return colorKey(deck.color);
}

export interface DeckParseResult {
  mainDeck: string[];
  eggDeck: string[];
  skipped: number;
  /** Cards trimmed because the deck or egg deck was already full. */
  trimmed: number;
}

const IMPORT_MAIN_LIMIT = 50;
const IMPORT_EGG_LIMIT = 5;

/**
 * Parses a DigimonCard.io-format deck list:
 *   // DigimonCard.io Deck List
 *   4 Agumon BT1-009
 * Lines starting with "//" are skipped. The last whitespace-separated token on
 * each data line is treated as the card ID; the first token is the count.
 * Unknown card IDs are counted in `skipped`; counts are capped to
 * banlist-aware per-card limits. Main deck is capped at 50, egg deck at 5.
 */
export function parseDeckList(text: string): DeckParseResult {
  const mainDeck: string[] = [];
  const eggDeck: string[] = [];
  let skipped = 0;
  let trimmed = 0;
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;
    const count = parseInt(tokens[0]!, 10);
    if (isNaN(count) || count < 1) continue;
    const cardId = tokens[tokens.length - 1]!;
    const def = getCardDefinition(cardId);
    if (!def) {
      skipped += 1;
      continue;
    }
    if (!isCardInActivePool(def)) continue;
    const cap = Math.min(def.maxCountInDeck, banlistLimit(cardId));
    const copies = Math.min(count, cap);
    const isEgg = kindOf(def) === "DigiEgg";
    const target = isEgg ? eggDeck : mainDeck;
    const targetLimit = isEgg ? IMPORT_EGG_LIMIT : IMPORT_MAIN_LIMIT;
    for (let i = 0; i < copies; i += 1) {
      if (target.length >= targetLimit) {
        trimmed += 1;
        break;
      }
      target.push(cardId);
    }
  }
  return { mainDeck, eggDeck, skipped, trimmed };
}

/**
 * Serializes a deck to the DigimonCard.io text format.
 * Egg cards appear before main-deck cards, each group sorted by card ID.
 */
export function serializeDeckList(deck: DeckListing): string {
  const countMap = new Map<string, number>();
  for (const id of [...deck.eggDeck, ...deck.mainDeck]) {
    countMap.set(id, (countMap.get(id) ?? 0) + 1);
  }
  const lines = ["// DigimonCard.io Deck List"];
  const eggIds = [...new Set(deck.eggDeck)].sort();
  const mainIds = [...new Set(deck.mainDeck)].sort();
  for (const cardId of [...eggIds, ...mainIds]) {
    const def = getCardDefinition(cardId);
    const name = def?.nameEn ?? cardId;
    lines.push(`${countMap.get(cardId)} ${name} ${cardId}`);
  }
  return lines.join("\n");
}
