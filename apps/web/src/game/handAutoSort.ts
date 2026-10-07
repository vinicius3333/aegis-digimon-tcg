import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.hand.auto-sort";

const listeners = new Set<() => void>();

function readHandAutoSort(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let current = readHandAutoSort();

/** Whether the hand re-sorts itself each time a card arrives or leaves. */
export function isHandAutoSortEnabled(): boolean {
  return current;
}

export function setHandAutoSortEnabled(next: boolean): void {
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Keep the current-session choice when storage is unavailable.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHandAutoSort(): boolean {
  return useSyncExternalStore(subscribe, isHandAutoSortEnabled, () => false);
}
