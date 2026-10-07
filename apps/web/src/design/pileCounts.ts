import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.pile-counts";
const SHOWN = "shown";
const HIDDEN = "hidden";

const listeners = new Set<() => void>();

function readPileCountsShown(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === SHOWN;
  } catch {
    return false;
  }
}

let currentShown = readPileCountsShown();

export function arePileCountsShown(): boolean {
  return currentShown;
}

export function setPileCountsShown(next: boolean): void {
  currentShown = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? SHOWN : HIDDEN);
  } catch {
    // Keep the current-session choice when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export function subscribePileCounts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Whether the board draws the egg, hand, deck and trash counter chips.
 * Off by default: the piles already carry their own counts.
 */
export function usePileCountsShown(): boolean {
  return useSyncExternalStore(subscribePileCounts, arePileCountsShown, () => false);
}
