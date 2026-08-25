/* How a deck pile reads (`Player.cs:406-458, 295-325`). The reference client
   draws a deck as a physical stack: its thickness follows the count, so a pile
   thinning out over the match is the de-facto deck-out warning, and it disappears
   entirely at zero rather than leaving an empty rectangle behind. A shuffle
   riffles the stack for a fifth of a second.

   The riffle plays on the server's own `deckShuffled`, which the engine emits from
   the single helper that randomizes a deck. It used to be inferred from cards moving
   back into a deck, which turned out to be exactly wrong: §3-2-3 forbids reordering a
   deck, so a card returned to a deck lands in place and nothing is shuffled — every
   printed "shuffle" in the card pool shuffles a SECURITY stack instead.

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

/**
 * Which pile an event riffles, or null when it riffles none. One event, one pile:
 * the server names both the seat and the deck it randomized, so nothing is inferred
 * from card movement any more.
 */
export function deckRiffleFromEvent(event: ServerEvent, key: number): DeckRiffle | null {
  if (event.kind !== "deckShuffled") return null;
  return { key, seat: event.seat, pile: event.deck };
}
