/* Deck builder layout choices as a shared store: the deck panel's width, grid or
   list view, and the pool's sort. localStorage is the instant source; the account
   sync (usePreferencesSync) carries them to a signed-in player's other devices. */

import { useSyncExternalStore } from "react";
import { CARD_SORTS, type CardSort } from "./cardFilters";

const STORAGE_KEY = "aegis:deckBuilder";

export const DECK_SHARE_MIN = 0.25;
export const DECK_SHARE_MAX = 0.75;
export const DECK_SHARE_PRESETS = { pool: 0.3, split: 0.45, deck: 0.7 } as const;

export type DeckView = "grid" | "list";

export interface DeckBuilderPreferences {
  deckShare: number;
  deckView: DeckView;
  deckSort: CardSort;
}

const DEFAULTS: DeckBuilderPreferences = {
  deckShare: DECK_SHARE_PRESETS.split,
  deckView: "grid",
  deckSort: "releaseDate",
};

export function clampDeckShare(share: number): number {
  return Math.min(DECK_SHARE_MAX, Math.max(DECK_SHARE_MIN, share));
}

export function isDeckView(value: unknown): value is DeckView {
  return value === "grid" || value === "list";
}

export function isCardSort(value: unknown): value is CardSort {
  return CARD_SORTS.includes(value as CardSort);
}

/** Keeps only valid values, so stored or synced data can never break the editor. */
export function sanitizeDeckBuilderPreferences(value: unknown): Partial<DeckBuilderPreferences> {
  if (typeof value !== "object" || value === null) return {};
  const { deckShare, deckView, deckSort } = value as Record<string, unknown>;
  return {
    ...(typeof deckShare === "number" && Number.isFinite(deckShare) && { deckShare: clampDeckShare(deckShare) }),
    ...(isDeckView(deckView) && { deckView }),
    ...(isCardSort(deckSort) && { deckSort }),
  };
}

function read(): DeckBuilderPreferences {
  try {
    return { ...DEFAULTS, ...sanitizeDeckBuilderPreferences(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")) };
  } catch {
    return DEFAULTS;
  }
}

let current = read();
const listeners = new Set<() => void>();

export function getDeckBuilderPreferences(): DeckBuilderPreferences {
  return current;
}

export function setDeckBuilderPreferences(changes: Partial<DeckBuilderPreferences>): void {
  const next = { ...current, ...sanitizeDeckBuilderPreferences(changes) };
  if (
    next.deckShare === current.deckShare &&
    next.deckView === current.deckView &&
    next.deckSort === current.deckSort
  ) {
    return;
  }
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // A blocked storage still applies the layout for this session.
  }
  for (const listener of listeners) listener();
}

export function subscribeDeckBuilderPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDeckBuilderPreferences(): DeckBuilderPreferences {
  return useSyncExternalStore(subscribeDeckBuilderPreferences, getDeckBuilderPreferences, () => DEFAULTS);
}
