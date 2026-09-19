import { getCardDefinition } from "./registry.js";

const SHARED_NUMBER_RULE = /[[(]Rule[\])]\s*Card Number:\s*Also treated as \[([A-Z0-9]+-\d+)\]/;

/**
 * The card number a printing counts as for deck building. A reprint such as RB1-004
 * carries "[Rule] Card Number: Also treated as [P-009]. A deck may not have more than
 * 4 total copies of this and [P-009]." (KB Q4075, Q4078, Q4079), so both printings
 * share one copy budget. Cards without the rule count as themselves.
 */
export function sharedCardNumber(cardId: string): string {
  const text = getCardDefinition(cardId)?.effectText ?? "";
  return text.match(SHARED_NUMBER_RULE)?.[1] ?? cardId;
}

/** Copies in the list that share `cardId`'s deck-building card number, itself included. */
export function sharedCardNumberCount(cardIds: readonly string[], cardId: string): number {
  const number = sharedCardNumber(cardId);
  let count = 0;
  for (const id of cardIds) if (sharedCardNumber(id) === number) count += 1;
  return count;
}

/** Distinct card ids in the list that share one deck-building card number, per number. */
export function sharedCardNumberGroups(cardIds: readonly string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const cardId of new Set(cardIds)) {
    const number = sharedCardNumber(cardId);
    const members = groups.get(number) ?? [];
    if (!members.includes(cardId)) members.push(cardId);
    groups.set(number, members);
  }
  return groups;
}
