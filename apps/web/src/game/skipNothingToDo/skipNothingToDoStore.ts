export const SKIP_NOTHING_TO_DO_STORAGE_KEY = "aegis.effects.skip-nothing-to-do";

function readSkipNothingToDo(): boolean {
  try {
    return localStorage.getItem(SKIP_NOTHING_TO_DO_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

export const skipNothingToDoStore = {
  enabled: readSkipNothingToDo(),
  listeners: new Set<() => void>(),
};
