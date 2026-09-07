import type { CardInstance, GameState, Seat } from "@aegis/shared";

/** CR 13-1-6: a checked card has no area until an effect relocates it or the check ends. */
export interface CheckedCard {
  card: CardInstance;
  seat: Seat;
}

const checking = new WeakMap<GameState, Map<string, CheckedCard>>();

/** Keep exact-card access for Security and "that checked card" effects, without counting it in security. */
export async function withCheckedCard<T>(state: GameState, entry: CheckedCard, resolve: () => Promise<T>): Promise<T> {
  let cards = checking.get(state);
  if (cards === undefined) {
    cards = new Map();
    checking.set(state, cards);
  }
  cards.set(entry.card.instanceId, entry);
  try {
    return await resolve();
  } finally {
    cards.delete(entry.card.instanceId);
    if (cards.size === 0) checking.delete(state);
  }
}

export function peekCheckedCard(state: GameState, instanceId: string): CheckedCard | undefined {
  return checking.get(state)?.get(instanceId);
}

/** Claim the card when an effect moves it into an area; it must no longer battle or move to trash afterward. */
export function takeCheckedCard(state: GameState, instanceId: string): CardInstance | undefined {
  const cards = checking.get(state);
  const entry = cards?.get(instanceId);
  cards?.delete(instanceId);
  return entry?.card;
}
