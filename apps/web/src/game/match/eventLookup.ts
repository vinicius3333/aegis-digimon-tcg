import type { ServerEvent } from "@aegis/shared";

/** Index of the last event of a kind in the batch, or -1. */
export function lastIndexOfKind(events: readonly ServerEvent[], kind: ServerEvent["kind"]): number {
  for (let index = events.length - 1; index >= 0; index -= 1) if (events[index]!.kind === kind) return index;
  return -1;
}

/** A new set with `id` removed, or the same set when it was not a member. */
export function withoutId(ids: ReadonlySet<string>, id: string): ReadonlySet<string> {
  if (!ids.has(id)) return ids;
  const next = new Set(ids);
  next.delete(id);
  return next;
}
