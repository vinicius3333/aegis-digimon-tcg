const STORAGE_KEY = "aegis.action-confirmation.enabled";

/**
 * Whether to show the optional final confirmation before a manual board action.
 * Rule-mandated choices deliberately do not use this preference.
 */
function readActionConfirmationsEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

let actionConfirmationsEnabled = readActionConfirmationsEnabled();

export function areActionConfirmationsEnabled(): boolean {
  return actionConfirmationsEnabled;
}

export function setActionConfirmationsEnabled(next: boolean): void {
  actionConfirmationsEnabled = next;
  try {
    localStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    // Keep the current-session behavior usable when storage is unavailable.
  }
}
