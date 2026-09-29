/* The light/dark theme as a shared store, so controls outside the app shell (the
   match's arena look dialog) switch the same theme the Settings screen does. */

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aegis:darkMode";

const listeners = new Set<() => void>();

function readDarkMode(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let current = readDarkMode();

export function getDarkMode(): boolean {
  return current;
}

export function applyDarkMode(): void {
  document.documentElement.classList.toggle("dark", current);
}

export function setDarkMode(dark: boolean): void {
  if (dark === current) return;
  current = dark;
  try {
    localStorage.setItem(STORAGE_KEY, String(dark));
  } catch {
    // The theme is cosmetic; a blocked storage still applies for this session.
  }
  applyDarkMode();
  for (const listener of listeners) listener();
}

export function subscribeDarkMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribeDarkMode, getDarkMode, () => false);
}
