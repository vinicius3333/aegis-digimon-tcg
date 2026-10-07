import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis:sortHand";
const listeners = new Set<() => void>();
let current = false;
try {
  current = localStorage.getItem(STORAGE_KEY) === "true";
} catch {
  // The preference still works for the current session.
}

export function setHandSorted(sorted: boolean): void {
  current = sorted;
  try {
    localStorage.setItem(STORAGE_KEY, String(sorted));
  } catch {
    // Storage may be unavailable.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useHandSorted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => false,
  );
}
