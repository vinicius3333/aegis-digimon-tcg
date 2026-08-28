import { bannedPairViolations, getCardDefinition, CardKind } from "@aegis/shared";
import { MAIN_DECK_SIZE, MAX_EGG_DECK_SIZE } from "./testDecks.js";
import { effectiveCopyLimit } from "./banlistRestrictions.js";

/**
 * Server-authoritative deck-legality gate (subsystem: deck-and-setup; BLK-05.2 /
 * SYS-05). The client-supplied deck is attacker-controlled input — the server owns
 * 100% of the rules, so an illegal deck must be rejected here, never trusted.
 *
 *   1. every cardId resolves to a known CardDefinition (no fabricated ids),
 *   2. main deck is exactly 50 and the egg deck is at most 5 (the `deck-and-setup`
 *      sizes, shared with `testDecks.assertLegalDeck`),
 *   3. Digi-Eggs may only appear in the egg deck; non-Digi-Eggs may only appear in
 *      the main deck (Comprehensive Rules §1-4),
 *   4. each distinct cardId's total count across the whole deck is within its
 *      default 4, lowered by an active banlist restriction (1 for restricted, 0 for
 *      banned),
 *   5. no banned pair is present: a banned-pair card is legal alone but may not share
 *      a deck with its partner (`BANNED_PAIRS` in @aegis/shared).
 */
export type DecklistValidation = { ok: true } | { ok: false; reason: string };

interface ReadonlyDecklist {
  readonly mainDeck: readonly string[];
  readonly eggDeck: readonly string[];
}

export function validateDecklist(deck: ReadonlyDecklist): DecklistValidation {
  for (const cardId of deck.mainDeck) {
    const def = getCardDefinition(cardId);
    if (def === undefined) {
      return { ok: false, reason: `unknown card: ${cardId}` };
    }
    if (def.kinds.includes(CardKind.DigiEgg)) {
      return { ok: false, reason: `Digi-Egg ${cardId} belongs in the egg deck, not the main deck` };
    }
  }

  for (const cardId of deck.eggDeck) {
    const def = getCardDefinition(cardId);
    if (def === undefined) {
      return { ok: false, reason: `unknown card: ${cardId}` };
    }
    if (!def.kinds.includes(CardKind.DigiEgg)) {
      return { ok: false, reason: `non-Digi-Egg ${cardId} cannot go in the egg deck` };
    }
  }

  if (deck.mainDeck.length !== MAIN_DECK_SIZE) {
    return {
      ok: false,
      reason: `main deck must be exactly ${MAIN_DECK_SIZE} cards, got ${deck.mainDeck.length}`,
    };
  }
  if (deck.eggDeck.length > MAX_EGG_DECK_SIZE) {
    return {
      ok: false,
      reason: `egg deck must be at most ${MAX_EGG_DECK_SIZE} cards, got ${deck.eggDeck.length}`,
    };
  }

  const allCards = [...deck.mainDeck, ...deck.eggDeck];
  const counts = new Map<string, number>();
  for (const cardId of allCards) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }
  for (const [cardId, count] of counts) {
    const cap = effectiveCopyLimit(cardId);
    if (count > cap) {
      return {
        ok: false,
        reason: `too many copies of ${cardId}: ${count} > limit ${cap}`,
      };
    }
  }

  const pairViolation = bannedPairViolations(allCards)[0];
  if (pairViolation !== undefined) {
    const [cardId, partnerCardId] = pairViolation;
    return {
      ok: false,
      reason: `${cardId} is banned in decks containing ${partnerCardId}`,
    };
  }

  return { ok: true };
}
