import type { CardDefinition } from "./types.js";
import { cardData, cardList } from "./data/index.js";
import { tokenDefinitions, resolveTokenCardId, isTokenDefinition } from "./tokens.js";

export { resolveTokenCardId, isTokenDefinition, tokenDefinitions };

/** Every card definition as an array (sorted by cardId in the generated data). */
export function allCards(): readonly CardDefinition[] {
  return [...cardList, ...tokenDefinitions];
}

function lookupCard(cardId: string): CardDefinition | undefined {
  return cardData[cardId] ?? tokenDefinitions.find((t) => t.cardId === cardId);
}

/**
 * CardDefinition lookup by card id. Both client (display) and server (rules) read
 * from the same generated table so they cannot disagree about static card facts.
 */
export function getCardDefinition(cardId: string): CardDefinition | undefined {
  return lookupCard(cardId);
}

/** Like getCardDefinition but throws when the id is unknown. */
export function requireCardDefinition(cardId: string): CardDefinition {
  const def = lookupCard(cardId);
  if (def === undefined) {
    throw new Error(`Unknown cardId: ${cardId}`);
  }
  return def;
}

/** True when a definition exists for the id. */
export function hasCardDefinition(cardId: string): boolean {
  return lookupCard(cardId) !== undefined;
}

/** All known card ids. */
export function allCardIds(): string[] {
  return [...Object.keys(cardData), ...tokenDefinitions.map((t) => t.cardId)].sort();
}
