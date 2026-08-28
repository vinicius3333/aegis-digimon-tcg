const STORAGE_KEY = "aegis.digivolution-cut-in.enabled";

/**
 * Whether the full-screen digivolution cut-in plays. Off by default, the way the
 * reference client ships `showCutInAnimation`: it is spectacle, and a player who
 * has seen it a hundred times wants the board back.
 */
function readCutInsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

let cutInsEnabled = readCutInsEnabled();

export function areCutInsEnabled(): boolean {
  return cutInsEnabled;
}

export function setCutInsEnabled(next: boolean): void {
  cutInsEnabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Keep the current-session behavior usable when storage is unavailable.
  }
}
