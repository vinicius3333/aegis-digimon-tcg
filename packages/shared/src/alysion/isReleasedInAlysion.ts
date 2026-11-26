import { isAlysionCard } from "#shared/alysion/isAlysionCard";
import { appOnlyReleaseDate, unreleasedAppOnlySets } from "#shared/cards/appOnlySets";
import type { CardDefinition } from "#shared/cards/types";

export function isReleasedInAlysion(card: Readonly<Pick<CardDefinition, "cardId" | "set">>, asOf: string): boolean {
  return isAlysionCard(card) && !unreleasedAppOnlySets.includes(card.set) && appOnlyReleaseDate <= asOf;
}
