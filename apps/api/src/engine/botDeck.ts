import { validateDecklist } from "./deckValidation.js";
import { BOT_DECKS, botDeckFor, type Decklist } from "./testDecks.js";

/**
 * The deck the bot actually sits down with, guaranteed to pass the same gate the room
 * applies to a human deck.
 *
 * `botDeckFor` resolves a catalog preset through `isFamousDeckAvailable`, which only
 * asks whether every card exists and is not outright banned. `validateDecklist` asks
 * more: an announced-but-unreleased card is illegal outside beta battle mode, and a
 * banned *pair* is illegal even though each card is fine alone. A preset can therefore
 * be "available" and still be rejected at seating — which used to throw out of
 * `seatPlayer` and strand the room with an empty opponent seat.
 *
 * Rather than re-listing those rules here (a copy that drifts every time the banlist
 * moves), this runs the authoritative gate and degrades to the random pool. Practising
 * against a different deck is a far better outcome for the player than a match that
 * never starts.
 */
export function playableBotDeck(requestedDeckId: string | undefined, betaBattleMode: boolean): Decklist {
  const requested = botDeckFor(requestedDeckId);
  if (validateDecklist(requested, { betaBattleMode }).ok) return requested;

  const fallback = BOT_DECKS.find((deck) => validateDecklist(deck, { betaBattleMode }).ok);
  if (fallback === undefined) {
    // The built-in pool is asserted legal at module load, so this is unreachable short of
    // a banlist edit that outlaws a starter deck. Surfacing it as an explicit failure beats
    // seating a deck the engine will reject mid-deal.
    throw new Error("no legal bot deck available");
  }
  return fallback;
}
