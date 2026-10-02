import { getCardDefinition } from "@aegis/shared";
import type { Translate } from "../../../i18n";
import type { StackCard } from "../types";

/** A card's name in a stack listing; a face-down card its owner can read keeps a face-down mark. */
export function stackCardCaption(card: StackCard, t: Translate): string {
  if (!card.cardId) return t("game.hiddenCard");
  const name = getCardDefinition(card.cardId)?.nameEn ?? card.cardId;
  return card.faceDown ? `${name} · ${t("game.faceDownSource")}` : name;
}
