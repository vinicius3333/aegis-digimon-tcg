import { SKIP_NOTHING_TO_DO_STORAGE_KEY, skipNothingToDoStore } from "@/game/skipNothingToDo/skipNothingToDoStore";

export function setSkipNothingToDoEnabled(enabled: boolean): void {
  if (skipNothingToDoStore.enabled === enabled) {
    return;
  }
  skipNothingToDoStore.enabled = enabled;
  try {
    localStorage.setItem(SKIP_NOTHING_TO_DO_STORAGE_KEY, String(enabled));
  } catch {}
  for (const listener of skipNothingToDoStore.listeners) {
    listener();
  }
}
