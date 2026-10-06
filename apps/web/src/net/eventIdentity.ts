import type { ServerEvent } from "@aegis/shared";

const identities = new WeakMap<ServerEvent, string>();
let localIdentity = 0;

/** A stream occurrence keeps its identity when a bounded log drops older events. */
export function eventIdentity(event: ServerEvent): string {
  const existing = identities.get(event);
  if (existing) return existing;
  const identity =
    "seq" in event && "batch" in event ? `${String(event.batch)}:${String(event.seq)}` : `local-${++localIdentity}`;
  identities.set(event, identity);
  return identity;
}

/** Fabricated batches copy their raw events; both renderers must name the same occurrence. */
export function inheritEventIdentity(source: ServerEvent, copy: ServerEvent): void {
  identities.set(copy, eventIdentity(source));
}
