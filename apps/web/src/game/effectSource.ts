/* Where an effect activated from, so the board can play the right moment for it
   (`Effects.cs:204-460`). The reference client does not play one generic sparkle:
   a field permanent glows in place, a card in the trash flies up out of the pile
   with an orange outline and a punch, and an Option rises out of the hand fan.

   `effectActivated` names the seat and the source *card*, not the zone it sits in.
   The zone is therefore resolved by asking the board where that card currently is
   — a read of the synchronized state, not a rule. A card the viewer cannot see
   (an opponent's hand) resolves to nothing and simply gets no zone-specific
   moment; the notice still narrates it.

   Pure: the caller supplies the lookup, this module decides what the cue is. */

import type { Seat, ServerEvent } from "@aegis/shared";

/** The zones the board can actually play a distinct moment for. */
export type EffectSourceZone = "field" | "trash" | "hand";

/** Where a card was found, as the board's own handle on it. */
export type EffectSourceSite =
  | { zone: "field"; permanentId: string }
  | { zone: "trash"; instanceId: string }
  | { zone: "hand"; instanceId: string };

/** Asks the board where a seat's copy of a card currently sits. */
export type EffectSourceLookup = (cardId: string, seat: Seat) => EffectSourceSite | undefined;

export interface EffectActivation {
  key: number;
  seat: Seat;
  cardId: string;
  site: EffectSourceSite;
}

/**
 * The zone-specific activation moment an event earns, or null when the event is
 * not an activation or its source cannot be located on the board.
 */
export function effectActivationFromEvent(
  event: ServerEvent,
  key: number,
  locate: EffectSourceLookup,
): EffectActivation | null {
  if (event.kind !== "effectActivated") return null;
  const site = locate(event.sourceCardId, event.seat);
  if (!site) return null;
  return { key, seat: event.seat, cardId: event.sourceCardId, site };
}

/** How long a zone's moment owns the card, so the caller can hold it exactly that long. */
export function effectActivationTrack(activation: EffectActivation): string {
  const site = activation.site;
  return `effectSource-${site.zone}-${site.zone === "field" ? site.permanentId : site.instanceId}`;
}
