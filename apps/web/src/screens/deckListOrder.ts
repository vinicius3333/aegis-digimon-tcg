/* The decks screen's order and name filter. The chosen order is a per-device
   preference in localStorage, like the other layout choices on this device. */

import { useSyncExternalStore } from "react";
import { getCardDefinition } from "@aegis/shared";
import { COLOR_KEYS, colorKey } from "../design/theme";
import type { DeckListing } from "../game/decks";

const STORAGE_KEY = "aegis:deckListSort";

export const DECK_LIST_SORTS = ["recent", "name", "color"] as const;

export type DeckListSort = (typeof DECK_LIST_SORTS)[number];

export const DEFAULT_DECK_LIST_SORT: DeckListSort = "recent";

const SHOWN_COLORS = 3;

export function isDeckListSort(value: unknown): value is DeckListSort {
  return DECK_LIST_SORTS.includes(value as DeckListSort);
}

/** The deck's colors, most printed first, as the list shows them. */
export function deckColors(deck: DeckListing): string[] {
  const counts = new Map<string, number>();
  for (const cardId of deck.mainDeck) {
    for (const color of getCardDefinition(cardId)?.colors ?? []) {
      const key = colorKey(color);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
  return ranked.length > 0 ? ranked.slice(0, SHOWN_COLORS) : [deck.color];
}

function colorRank(deck: DeckListing): number {
  const rank = (COLOR_KEYS as readonly string[]).indexOf(deckColors(deck)[0] ?? "");
  return rank === -1 ? COLOR_KEYS.length : rank;
}

const compareNames = (a: DeckListing, b: DeckListing) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });

const COMPARE: Record<DeckListSort, (a: DeckListing, b: DeckListing) => number> = {
  recent: (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
  name: compareNames,
  color: (a, b) => colorRank(a) - colorRank(b) || compareNames(a, b),
};

/**
 * The decks whose name contains `query`, in the chosen order. Decks saved before
 * edits were timestamped keep their stored order at the end of "recent".
 */
export function orderDecks(decks: readonly DeckListing[], sort: DeckListSort, query = ""): DeckListing[] {
  const needle = query.trim().toLocaleLowerCase();
  const matching = needle ? decks.filter((deck) => deck.name.toLocaleLowerCase().includes(needle)) : [...decks];
  return matching.sort(COMPARE[sort]);
}

function read(): DeckListSort {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isDeckListSort(stored) ? stored : DEFAULT_DECK_LIST_SORT;
  } catch {
    return DEFAULT_DECK_LIST_SORT;
  }
}

let current = read();
const listeners = new Set<() => void>();

export function getDeckListSort(): DeckListSort {
  return current;
}

export function setDeckListSort(sort: DeckListSort): void {
  if (!isDeckListSort(sort) || sort === current) return;
  current = sort;
  try {
    localStorage.setItem(STORAGE_KEY, sort);
  } catch {
    // A blocked storage still applies the order for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDeckListSort(): DeckListSort {
  return useSyncExternalStore(subscribe, getDeckListSort, () => DEFAULT_DECK_LIST_SORT);
}
