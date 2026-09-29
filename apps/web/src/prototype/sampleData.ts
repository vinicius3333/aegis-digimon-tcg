/* Card and deck data are real: they come from @aegis/shared and the lobby deck lists. */

import { allCards, getCardDefinition, isTamer } from "@aegis/shared";
import { DECKS, FAMOUS_DECKS, FAMOUS_DECK_GROUPS, displayCoverCard, type DeckListing } from "@/game/decks";

export function deckColors(deck: DeckListing): string[] {
  const counts = new Map<string, number>();
  for (const cardId of deck.mainDeck) {
    for (const color of getCardDefinition(cardId)?.colors ?? []) counts.set(color, (counts.get(color) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([color]) => color);
}

export function deckCover(deck: DeckListing): string {
  return displayCoverCard(deck) ?? deck.mainDeck[deck.mainDeck.length - 1] ?? "BT1-010";
}

/** Distinct cards from a deck, highest level first when `digimonOnly` is set. */
export function pickCards(deck: DeckListing, count: number, { digimonOnly = false } = {}): string[] {
  const unique = [...new Set(deck.mainDeck)];
  const pool = digimonOnly
    ? unique
        .filter((cardId) => getCardDefinition(cardId)?.level !== undefined)
        .sort((a, b) => (getCardDefinition(b)?.level ?? 0) - (getCardDefinition(a)?.level ?? 0))
    : unique;
  return pool.slice(0, count);
}

export function pickTamers(deck: DeckListing): string[] {
  return [...new Set(deck.mainDeck)].filter((cardId) => {
    const card = getCardDefinition(cardId);
    return card !== undefined && isTamer(card);
  });
}

export const starterDecks = DECKS;
export const famousDecks = FAMOUS_DECKS;
export const famousDeckGroups = FAMOUS_DECK_GROUPS;

export function setsNewestFirst(): string[] {
  const order = (set: string) => {
    const match = /^([A-Z]+)(\d+)$/.exec(set);
    return match ? [match[1]!, Number(match[2])] : [set, 0];
  };
  return [...new Set(allCards().map((card) => card.set))]
    .filter((set) => /^(BT|EX)\d+$/.test(set))
    .sort((a, b) => {
      const [prefixA, numberA] = order(a);
      const [prefixB, numberB] = order(b);
      return prefixA === prefixB ? Number(numberB) - Number(numberA) : String(prefixA).localeCompare(String(prefixB));
    });
}
