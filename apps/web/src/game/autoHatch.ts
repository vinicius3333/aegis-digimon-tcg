import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis.breeding.auto-hatch";

const listeners = new Set<() => void>();

function readAutoHatch(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let current = readAutoHatch();

/** Whether the player automatically hatches an egg during the breeding phase. */
export function isAutoHatchEnabled(): boolean {
  return current;
}

export function setAutoHatchEnabled(next: boolean): void {
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

export function useAutoHatch(): boolean {
  return useSyncExternalStore(subscribe, isAutoHatchEnabled, () => false);
}
