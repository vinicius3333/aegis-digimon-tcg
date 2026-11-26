import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";

export function groupEffectQueueByPermanent(
  entries: readonly EffectQueueEntry[],
): ReadonlyMap<string, readonly EffectQueueEntry[]> {
  const grouped = new Map<string, EffectQueueEntry[]>();
  for (const entry of entries) {
    if (entry.sourcePermanentId !== undefined) {
      grouped.set(entry.sourcePermanentId, [...(grouped.get(entry.sourcePermanentId) ?? []), entry]);
    }
  }
  return grouped;
}
