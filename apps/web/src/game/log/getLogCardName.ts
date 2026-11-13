import { getCardDefinition } from "@aegis/shared/cards/registry";
import { formatFieldReference } from "@/design/fieldReference/formatFieldReference";

type Params = { cardId: string; permanentId?: string };

export function getLogCardName({ cardId, permanentId }: Params): string {
  const name = getCardDefinition(cardId)?.nameEn;
  const card = name ? `${name} (${cardId})` : cardId;
  if (!permanentId) {
    return card;
  }
  return `${card} ${formatFieldReference(permanentId)}`;
}
