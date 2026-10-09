import {
  deckFormat,
  formatCopyLimit,
  formatCardViolation,
  formatPairViolations,
  type DeckFormat,
} from "../deckFormat.js";
import { CardKind } from "../schema/enums.js";
import { sharedCardNumberGroups } from "../cards/sharedCardNumbers.js";
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
  formatViolations: string[];
}

/** Legality under the live banlist, the rule the lobby, the deck list and public decks all share. */
export function deckLegality(deck: DeckCards, options?: { unlimited?: boolean; format?: DeckFormat }): DeckLegality {
  const format = deckFormat(options?.format, options?.unlimited);
  const cap = (id: string) => formatCopyLimit(id, format);
  const cardIds = [...deck.mainDeck, ...deck.eggDeck];
  const counts = new Map<string, number>();
  for (const id of cardIds) counts.set(id, (counts.get(id) ?? 0) + 1);
  const unknownCards = [...counts.keys()].filter((id) => getCardDefinition(id) === undefined);
  const banViolations = [...counts.entries()].filter(([id, count]) => count > cap(id));
  for (const [, members] of sharedCardNumberGroups(cardIds)) {
    if (members.length < 2) continue;
    const count = members.reduce((sum, id) => sum + (counts.get(id) ?? 0), 0);
    if (count > Math.min(...members.map(cap))) banViolations.push([members.join(" + "), count]);
  }
  const pairViolations = formatPairViolations(cardIds, format);
  const formatViolations = [...counts.keys()].flatMap((id) => {
    const reason = formatCardViolation(id, format);
    return reason ? [reason] : [];
  });
  const zonesValid =
    deck.mainDeck.every((id) => !getCardDefinition(id)?.kinds.includes(CardKind.DigiEgg)) &&
    deck.eggDeck.every((id) => getCardDefinition(id)?.kinds.includes(CardKind.DigiEgg));
  return {
    legal:
      deck.mainDeck.length === MAIN_DECK_TARGET &&
      deck.eggDeck.length <= EGG_DECK_TARGET &&
      unknownCards.length === 0 &&
      banViolations.length === 0 &&
      pairViolations.length === 0 &&
      formatViolations.length === 0 &&
      zonesValid,
    unknownCards,
    banViolations,
    pairViolations,
    formatViolations,
  };
}
