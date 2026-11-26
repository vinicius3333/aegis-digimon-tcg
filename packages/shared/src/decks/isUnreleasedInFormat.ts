import { isReleasedInAlysion } from "#shared/alysion/isReleasedInAlysion";
import { isBetaOnlyCard } from "#shared/cards/cardPool";
import type { CardDefinition } from "#shared/cards/types";
import { deckFormatSettings, type DeckFormat } from "#shared/deckFormat";

export function isUnreleasedInFormat(
  card: Readonly<Pick<CardDefinition, "cardId" | "set">>,
  format: DeckFormat,
  asOf: string = new Date().toISOString().slice(0, 10),
): boolean {
  return (
    isBetaOnlyCard(card, asOf) && !(deckFormatSettings(format).set === "alysion" && isReleasedInAlysion(card, asOf))
  );
}
