import type { PlayerIdentity } from "./design/primitives";
import { filterDeckToKnownCards, type DeckListing } from "./game/decks";

const STORAGE_KEY = "aegis:player";

export const DEFAULT_PLAYER: PlayerIdentity = {
  name: "Tamer",
  color: "Blue",
  shards: 12480,
  avatarId: null,
  avatarUrl: null,
};

export function loadIdentity(): PlayerIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PLAYER, ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_PLAYER;
}

export function saveIdentity(player: PlayerIdentity): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

export function hasStoredIdentity(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

const DECKS_KEY = "aegis:decks";
const ACTIVE_DECK_KEY = "aegis:activeDeckId";

export function loadDecks(): DeckListing[] {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (raw) return (JSON.parse(raw) as DeckListing[]).map(filterDeckToKnownCards);
  } catch {
    // ignore malformed storage
  }
  return [];
}

export function saveDecks(decks: DeckListing[]): void {
  localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
}

export function loadActiveDeckId(decks: DeckListing[]): string {
  const stored = localStorage.getItem(ACTIVE_DECK_KEY);
  if (stored && decks.some((d) => d.id === stored)) return stored;
  return decks[0]?.id ?? "";
}

export function saveActiveDeckId(id: string): void {
  localStorage.setItem(ACTIVE_DECK_KEY, id);
}
