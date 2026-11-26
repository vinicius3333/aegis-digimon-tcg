import type { DeckListing } from "@/game/decks";
import { isBetaCard } from "@/screens/isBetaCard";
import type { DeckFormat } from "@aegis/shared/deckFormat";

export function deckHasBetaCards(
  deck: Pick<DeckListing, "mainDeck" | "eggDeck" | "format">,
  format: DeckFormat = deck.format ?? "standard",
): boolean {
  return [...deck.mainDeck, ...deck.eggDeck].some((cardId) => isBetaCard(cardId, format));
}
