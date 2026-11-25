import type { EffectDpChange, ServerEvent } from "@aegis/shared/protocol/events";

export function attachPendingDpChanges(pending: EffectDpChange[], event: ServerEvent): ServerEvent {
  if (event.kind === "turnEnded") {
    pending.length = 0;
    return event;
  }
  if (event.kind !== "effectResolved" || pending.length === 0) {
    return event;
  }
  return { ...event, dpChanges: pending.splice(0) };
}
