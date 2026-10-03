import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.field-layout";

/**
 * How each battle area is drawn.
 * Organized sorts the Digimon and moves Tamers and Options to a smaller row of their
 * own, where identical copies collapse into one card. Classic keeps play order in one row.
 */
export enum FieldLayout {
  Organized = "organized",
  Classic = "classic",
}

const listeners = new Set<() => void>();

function readFieldLayout(): FieldLayout {
  try {
    return localStorage.getItem(STORAGE_KEY) === FieldLayout.Classic ? FieldLayout.Classic : FieldLayout.Organized;
  } catch {
    return FieldLayout.Organized;
  }
}

let currentLayout = readFieldLayout();

export function getFieldLayout(): FieldLayout {
  return currentLayout;
}

export function setFieldLayout(next: FieldLayout): void {
  currentLayout = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Keep the current-session layout when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

export function subscribeFieldLayout(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFieldLayout(): FieldLayout {
  return useSyncExternalStore(subscribeFieldLayout, getFieldLayout, () => FieldLayout.Organized);
}
