import { bannedPairViolations, effectiveCopyLimit } from "../banlist.js";
import { getCardDefinition } from "../cards/registry.js";

export const MAIN_DECK_TARGET = 50;
export const EGG_DECK_TARGET = 5;

export interface DeckCards {
  mainDeck: readonly string[];
  eggDeck: readonly string[];
}

export interface DeckLegality {
  legal: boolean;
  unknownCards: string[];
  banViolations: [string, number][];
  pairViolations: [string, string][];
}

/** Legality under the live banlist, the rule the lobby, the deck list and public decks all share. */
export function deckLegality(deck: DeckCards): DeckLegality {
  const cardIds = [...deck.mainDeck, ...deck.eggDeck];
  const counts = new Map<string, number>();
  for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const unknownCards = [...counts.keys()].filter((id) => getCardDefinition(id) === undefined);
  const banViolations = [...counts.entries()].filter(([id, count]) => count > effectiveCopyLimit(id));
  const pairViolations = bannedPairViolations(cardIds);
  return {
    legal:
      deck.mainDeck.length === MAIN_DECK_TARGET &&
      deck.eggDeck.length <= EGG_DECK_TARGET &&
      unknownCards.length === 0 &&
      banViolations.length === 0 &&
      pairViolations.length === 0,
    unknownCards,
    banViolations,
    pairViolations,
  };
}
