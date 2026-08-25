/* How a deck pile reads (`Player.cs:406-458, 295-325`). The reference client
   draws a deck as a physical stack: its thickness follows the count, so a pile
   thinning out over the match is the de-facto deck-out warning, and it disappears
   entirely at zero rather than leaving an empty rectangle behind. A shuffle
   riffles the stack for a fifth of a second.

   The protocol has no shuffle event, so a riffle is played for the moment that
   always implies one: cards being put back into a deck. Everything else is left
   alone rather than guessed at.

   Pure arithmetic and event reading. */

import type { Seat, ServerEvent } from "@aegis/shared";

/** Cards per drawn layer, matching the reference client's stack thickness. */
export const DECK_CARDS_PER_LAYER = 8;

/** As many layers as the pile can show before the offsets stop reading as depth. */
export const DECK_MAX_LAYERS = 6;

/**
 * How many layers a pile of `count` cards is drawn with. Zero cards is no pile at
 * all; any non-empty deck keeps at least one layer so the top card still has a
 * card to sit on.
 */
export function deckLayerCount(count: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.min(DECK_MAX_LAYERS, Math.round(count / DECK_CARDS_PER_LAYER)));
}

/** The two piles that can be riffled. */
export type DeckPile = "deck" | "eggDeck";

/** Which pile was shuffled, and whose. */
export interface DeckRiffle {
  key: number;
  seat: Seat;
  pile: DeckPile;
}

const SHUFFLE_DESTINATIONS: readonly string[] = ["deck", "deckBottom", "eggDeck"];

/** Asks the board which seat owns a card that just moved. */
export type CardSeatLookup = (instanceId: string) => Seat | undefined;

/**
 * Which pile an event riffles, or null when it riffles none. Cards returning to a
 * deck are the one movement that always ends in a shuffle; a draw, a mill and a
 * recovery all move cards out of a deck and leave its order alone.
 *
 * `cardsMoved` names instances rather than a seat, so the owner is resolved from
 * the board. A card that landed somewhere the viewer cannot see resolves to
 * nothing and no pile riffles, rather than both of them riffling on a guess.
 */
export function deckRiffleFromEvent(event: ServerEvent, key: number, seatOf: CardSeatLookup): DeckRiffle | null {
  if (event.kind !== "cardsMoved") return null;
  if (!SHUFFLE_DESTINATIONS.includes(event.to)) return null;
  const seat = event.instanceIds.map(seatOf).find((candidate) => candidate !== undefined);
  if (seat === undefined) return null;
  return { key, seat, pile: event.to === "eggDeck" ? "eggDeck" : "deck" };
}
