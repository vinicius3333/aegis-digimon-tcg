import { getCardDefinition } from "@aegis/shared";

export function printedCardName(cardId: string): string {
  return getCardDefinition(cardId)?.nameEn ?? cardId;
}
