import type { CardInstance, Seat } from "@aegis/shared";

import type { PrimitivesContext } from "./context.js";

/**
 * The watcher events for cards an effect or a Barrier cost moved from `seat`'s security stack
 * to trash. Shared by the security-trash verb and the generic trash verb, which reaches
 * security when a card trashes itself from there as a cost (ST22-10).
 */
export async function fireSecurityTrashedEvents(
  engine: PrimitivesContext["engine"],
  seat: Seat,
  moved: readonly CardInstance[],
  removedByEffect: boolean,
): Promise<void> {
  // SubTrigger bus: a resolving EFFECT removed cards from `seat`'s security stack (not an
  // attack-driven security check, which routes through its own seam). The payload names
  // the affected seat so a "when an effect removes from YOUR security" watcher (BT15-084)
  // gates on its own stack.
  if (removedByEffect) {
    await engine.fireSubTrigger?.("whenEffectRemovesFromSecurity", { removedFromSecuritySeat: seat });
  }
  // Generic removal watchers (BT4-088) care that a card left security regardless of
  // whether it was checked or removed by an effect. Security checks already fire this
  // event at their own movement seam; effect-driven trash must reach the same bus too.
  await engine.fireSubTrigger?.("whenSecurityRemoved", {
    removedFromSecuritySeat: seat,
    ...(removedByEffect ? { securityRemovedByEffect: true } : {}),
  });
  await engine.fireSubTrigger?.("whenCardTrashedFromSecurity", {
    removedFromSecuritySeat: seat,
    trashedFromSecurityInstanceIds: moved.map((c) => c.instanceId),
  });
  // Effect-only counterpart for cards whose wording says "trashed from your security
  // stack by an effect" (BT17-036). Unlike whenCardTrashedFromSecurity, this event does
  // not fire for an ordinary security check, which also sends its checked card to trash.
  if (removedByEffect) {
    await engine.fireSubTrigger?.("whenEffectTrashesFromSecurity", {
      removedFromSecuritySeat: seat,
      trashedFromSecurityInstanceIds: moved.map((c) => c.instanceId),
    });
  }
}
