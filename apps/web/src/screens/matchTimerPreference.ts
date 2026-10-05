const STORAGE_KEY = "aegis:match-timer";

/** A browser preference shared by casual queues and private hosts, including guests. */
export function loadMatchTimerPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function saveMatchTimerPreference(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(enabled));
  } catch {
    // The current lobby remains usable when browser storage is unavailable.
  }
}
