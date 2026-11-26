import { getCardDefinition } from "@aegis/shared/cards/registry";
import type { DeckFormat } from "@aegis/shared/deckFormat";
import { isUnreleasedInFormat } from "@aegis/shared/decks/isUnreleasedInFormat";

export function isBetaCard(cardId: string, format: DeckFormat = "standard"): boolean {
  const card = getCardDefinition(cardId);
  return card !== undefined && isUnreleasedInFormat(card, format);
}
