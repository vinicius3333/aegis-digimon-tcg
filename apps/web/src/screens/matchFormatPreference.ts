import type { MatchBestOf } from "@aegis/shared";

const STORAGE_KEY = "aegis:match-format";

/** Kept beside the timer preference: the same browser choice for casual queues and private hosts. */
export function loadMatchFormatPreference(): MatchBestOf {
  try {
    return localStorage.getItem(STORAGE_KEY) === "3" ? 3 : 1;
  } catch {
    return 1;
  }
}

export function saveMatchFormatPreference(bestOf: MatchBestOf): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(bestOf));
  } catch {
    // The current lobby remains usable when browser storage is unavailable.
  }
}
