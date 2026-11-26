import type { EffectQueueEntry } from "@aegis/shared/protocol/EffectQueueEntry";

export function getEffectOrderStep(entry: EffectQueueEntry): string {
  return entry.lastPosition === undefined ? String(entry.position) : `${entry.position}–${entry.lastPosition}`;
}
