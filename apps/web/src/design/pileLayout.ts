import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.pile-layout";

/**
 * Where the viewer's raising area and deck/trash sit on the board.
 * Tabletop puts the raising area on the right and the deck and trash on the left,
 * which mirrors the opponent's side across the table.
 */
export enum PileLayout {
  Tabletop = "tabletop",
  Classic = "classic",
}

const listeners = new Set<() => void>();

function readPileLayout(): PileLayout {
  try {
    return localStorage.getItem(STORAGE_KEY) === PileLayout.Classic ? PileLayout.Classic : PileLayout.Tabletop;
  } catch {
    return PileLayout.Tabletop;
  }
}

let currentLayout = readPileLayout();

export function getPileLayout(): PileLayout {
  return currentLayout;
}

export function setPileLayout(next: PileLayout): void {
  currentLayout = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the current-session layout when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export function subscribePileLayout(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePileLayout(): PileLayout {
  return useSyncExternalStore(subscribePileLayout, getPileLayout, () => PileLayout.Tabletop);
}
