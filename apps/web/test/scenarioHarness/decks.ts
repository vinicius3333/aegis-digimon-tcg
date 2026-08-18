import { assertLegalDeck, type Decklist } from "@aegis-api/engine/testDecks.js";

/**
 * Replace every copy of one card id with another in a base deck's main deck,
 * preserving array position (and therefore, under a fixed seed, exactly where the
 * swapped-in card lands in the shuffle — see the seed-search note in each scenario
 * that uses this). Re-validates legality so a bad swap (wrong kind/count) fails
 * loudly at test-module load instead of at deal time.
 */
export function swapMainDeckCard(base: Decklist, fromCardId: string, toCardId: string): Decklist {
  const mainDeck = base.mainDeck.map((id) => (id === fromCardId ? toCardId : id));
  const swapped: Decklist = { mainDeck, eggDeck: base.eggDeck };
  assertLegalDeck(swapped);
  return swapped;
}
