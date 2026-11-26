import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";
import { EffectQueueZone } from "@aegis/shared/protocol/EffectQueueZone";

const NO_ENTRIES: readonly EffectQueueEntry[] = [];
let latest: { json: string; entries: readonly EffectQueueEntry[] } = { json: "[]", entries: NO_ENTRIES };

function isEffectQueueEntry(value: unknown): value is EffectQueueEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entry = value as Record<string, unknown>;
  return (
    (entry.seat === 0 || entry.seat === 1) &&
    typeof entry.position === "number" &&
    (entry.lastPosition === undefined || typeof entry.lastPosition === "number") &&
    (entry.sourceCardId === undefined || typeof entry.sourceCardId === "string") &&
    (entry.sourcePermanentId === undefined || typeof entry.sourcePermanentId === "string") &&
    (entry.timing === undefined || typeof entry.timing === "string") &&
    (entry.sourceZone === undefined || Object.values(EffectQueueZone).some((zone) => zone.value === entry.sourceZone))
  );
}

function readEntries(json: string): readonly EffectQueueEntry[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) && parsed.every(isEffectQueueEntry) ? parsed : NO_ENTRIES;
  } catch {
    return NO_ENTRIES;
  }
}

export function parseEffectQueue(json: string | undefined): readonly EffectQueueEntry[] {
  if (json === undefined || json === latest.json) {
    return json === undefined ? NO_ENTRIES : latest.entries;
  }
  latest = { json, entries: readEntries(json) };
  return latest.entries;
}
