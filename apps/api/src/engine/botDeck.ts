import {
  ALL_FAMOUS_DECKS,
  famousDeckById,
  allCards,
  CardKind,
  formatCardViolation,
  formatCopyLimit,
  type DeckFormat,
} from "@aegis/shared";
import { validateDecklist } from "./deckValidation.js";
import { BOT_DECKS, type Decklist } from "./testDecks.js";

/**
 * The deck the bot actually sits down with, guaranteed to pass the same gate the room
 * applies to a human deck.
 *
 * `isFamousDeckAvailable` only asks whether every card exists and is not outright banned.
 * `validateDecklist` asks more: an announced-but-unreleased card is illegal outside beta battle mode, and a
 * banned *pair* is illegal even though each card is fine alone. A preset can therefore
 * be "available" and still be rejected at seating — which used to throw out of
 * `seatPlayer` and strand the room with an empty opponent seat.
 *
 * This runs the authoritative gate for both requested and random presets. If the
 * requested preset cannot be played, the bot draws from the same legal catalog pool.
 */
export function playableBotDeck(
  requestedDeckId: string | undefined,
  betaBattleMode: boolean,
  format: DeckFormat = "standard",
): Decklist {
  const requested = requestedDeckId === undefined ? undefined : famousDeckById(requestedDeckId);
  if (requested && validateDecklist(requested.decklist, { betaBattleMode, format }).ok) {
    return { mainDeck: [...requested.decklist.mainDeck], eggDeck: [...requested.decklist.eggDeck] };
  }

  const candidates = ALL_FAMOUS_DECKS.filter(
    (preset) => validateDecklist(preset.decklist, { betaBattleMode, format }).ok,
  );
  if (candidates.length > 0) {
    const selected = candidates[Math.floor(Math.random() * candidates.length)]!;
    return { mainDeck: [...selected.decklist.mainDeck], eggDeck: [...selected.decklist.eggDeck] };
  }

  const fallback = BOT_DECKS.find((deck) => validateDecklist(deck, { betaBattleMode, format }).ok);
  if (fallback === undefined) {
    // The built-in pool is asserted legal at module load, so this is unreachable short of
    // a banlist edit that outlaws a starter deck. Surfacing it as an explicit failure beats
    // seating a deck the engine will reject mid-deal.
    const mainDeck: string[] = [];
    for (const card of allCards()) {
      if (card.kinds.includes(CardKind.DigiEgg) || formatCardViolation(card.cardId, format)) continue;
      const count = Math.min(formatCopyLimit(card.cardId, format), 50 - mainDeck.length);
      mainDeck.push(...Array(count).fill(card.cardId));
      if (mainDeck.length === 50 && validateDecklist({ mainDeck, eggDeck: [] }, { betaBattleMode, format }).ok)
        return { mainDeck, eggDeck: [] };
    }
    throw new Error("no legal bot deck available");
  }
  return fallback;
}
