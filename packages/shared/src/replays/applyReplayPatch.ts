type JsonRecord = Record<string, unknown>;

const MAX_ARRAY_LENGTH = 5000;
const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function applyReplayPatch(previous: unknown, patch: unknown): unknown {
  if (!isRecord(patch)) throw new Error("Invalid replay patch");
  if ("r" in patch) return patch.r;
  if (isRecord(patch.o)) return applyObjectPatch(previous, patch.o, patch.d);
  if (isRecord(patch.a)) return applyArrayPatch(previous, patch.a, patch.n);
  throw new Error("Invalid replay patch");
}

function applyObjectPatch(previous: unknown, changed: JsonRecord, deleted: unknown): JsonRecord {
  if (!isRecord(previous)) throw new Error("Replay patch does not match an object");
  const next: JsonRecord = { ...previous };
  for (const [key, child] of Object.entries(changed)) {
    if (FORBIDDEN_KEYS.has(key)) throw new Error("Invalid replay patch key");
    next[key] = applyReplayPatch(previous[key], child);
  }
  if (deleted === undefined) return next;
  if (!Array.isArray(deleted)) throw new Error("Invalid replay patch deletions");
  for (const key of deleted) {
    if (typeof key !== "string") throw new Error("Invalid replay patch deletions");
    delete next[key];
  }
  return next;
}

function applyArrayPatch(previous: unknown, changed: JsonRecord, length: unknown): unknown[] {
  if (!Array.isArray(previous)) throw new Error("Replay patch does not match an array");
  if (typeof length !== "number" || !Number.isInteger(length) || length < 0 || length > MAX_ARRAY_LENGTH) {
    throw new Error("Invalid replay patch length");
  }
  const next = previous.slice(0, length);
  while (next.length < length) next.push(null);
  for (const [key, child] of Object.entries(changed)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key) {
      throw new Error("Invalid replay patch index");
    }
    next[index] = applyReplayPatch(previous[index], child);
  }
  return next;
}
