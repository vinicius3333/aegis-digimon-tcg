import { type StackCard } from "../types";

export interface IndexedStackCard {
  card: StackCard;
  index: number;
}

export function groupStackCardsByRole({
  cards,
}: {
  cards: StackCard[];
}): Record<StackCard["role"], IndexedStackCard[]> {
  const groups: Record<StackCard["role"], IndexedStackCard[]> = { top: [], stack: [], linked: [] };
  cards.forEach((card, index) => groups[card.role].push({ card, index }));
  return groups;
}
