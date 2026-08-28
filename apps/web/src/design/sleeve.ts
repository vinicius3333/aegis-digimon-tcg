import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.sleeve";

export interface CardSleeve {
  id: string;
  label: string;
  collection: string;
  src?: string;
}

export const CARD_SLEEVES: readonly CardSleeve[] = [
  {
    id: "classic",
    label: "Aegis",
    collection: "Original",
  },
  {
    id: "omnimon",
    label: "Omnimon",
    collection: "Official Card Sleeves",
    src: "/sleeves/omnimon.png",
  },
  {
    id: "alphamon",
    label: "Alphamon",
    collection: "Official Card Sleeves",
    src: "/sleeves/alphamon.png",
  },
  {
    id: "official-03-adventure",
    label: "Adventure",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-adventure.png",
  },
  {
    id: "official-03-chronicle",
    label: "Chronicle",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-chronicle.png",
  },
  {
    id: "official-03-generations",
    label: "Generations",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-generations.png",
  },
  {
    id: "official-03-ghost-game",
    label: "Ghost Game",
    collection: "Official Card Sleeves 03",
    src: "/sleeves/official-03-ghost-game.png",
  },
];

export const DEFAULT_CARD_SLEEVE = CARD_SLEEVES[1]!;

const listeners = new Set<() => void>();

function isCardSleeveId(id: string | null): id is string {
  return CARD_SLEEVES.some((sleeve) => sleeve.id === id);
}

function readId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isCardSleeveId(stored) ? stored : DEFAULT_CARD_SLEEVE.id;
  } catch {
    return DEFAULT_CARD_SLEEVE.id;
  }
}

let currentId = readId();

export function getCardSleeveId(): string {
  return currentId;
}

export function setCardSleeveId(id: string): void {
  if (!isCardSleeveId(id)) return;
  currentId = id;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The sleeve is cosmetic; a blocked storage still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function subscribeCardSleeve(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function cardSleeveById(id: string): CardSleeve {
  return CARD_SLEEVES.find((sleeve) => sleeve.id === id) ?? DEFAULT_CARD_SLEEVE;
}

export function useCardSleeve(): CardSleeve {
  const id = useSyncExternalStore(subscribeCardSleeve, getCardSleeveId, () => DEFAULT_CARD_SLEEVE.id);
  return cardSleeveById(id);
}
