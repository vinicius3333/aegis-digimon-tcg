import type { CardDefinition } from "@aegis/shared/cards/types";
import { cardSearchMatch, type CardSort } from "@/screens/cardFilters";
import { sortCards } from "@/screens/cardSorting";

type Params = {
  cards: readonly CardDefinition[];
  sort: CardSort;
  query: string;
  textOnly?: boolean;
};

export function sortSearchResults({ cards, sort, query, textOnly = false }: Params): CardDefinition[] {
  if (sort !== "name") {
    return sortCards(cards, sort);
  }
  const nameMatches = cards.filter((card) => cardSearchMatch(card, query, textOnly) === "name");
  const textMatches = cards.filter((card) => cardSearchMatch(card, query, textOnly) === "text");
  return [...sortCards(nameMatches, sort), ...sortCards(textMatches, sort)];
}
