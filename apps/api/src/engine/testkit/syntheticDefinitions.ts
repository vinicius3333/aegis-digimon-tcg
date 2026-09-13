import type { CardDefinition } from "@aegis/shared";

// Shared across test files because the serial Vitest worker reuses its module graph.
export const syntheticDefinitions = new Map<string, CardDefinition>();

type CardLookups = Pick<
  typeof import("@aegis/shared"),
  "getCardDefinition" | "requireCardDefinition" | "hasCardDefinition" | "allCards" | "allCardIds"
>;

/** Test-only lookup overlay. Never mutates the production catalog or real definitions. */
export function syntheticCardLookups(actual: CardLookups, fixtures: ReadonlyMap<string, CardDefinition>): CardLookups {
  function getCardDefinition(cardId: string): CardDefinition | undefined {
    if (fixtures.has(cardId) && actual.hasCardDefinition(cardId)) {
      throw new Error(`Synthetic fixture must not replace a real card: ${cardId}`);
    }
    return fixtures.get(cardId) ?? actual.getCardDefinition(cardId);
  }
  function validateFixtures(): void {
    for (const cardId of fixtures.keys()) getCardDefinition(cardId);
  }
  return {
    getCardDefinition,
    requireCardDefinition(cardId) {
      return getCardDefinition(cardId) ?? actual.requireCardDefinition(cardId);
    },
    hasCardDefinition(cardId) {
      return getCardDefinition(cardId) !== undefined;
    },
    allCards() {
      validateFixtures();
      return [...actual.allCards(), ...fixtures.values()];
    },
    allCardIds() {
      validateFixtures();
      return [...actual.allCardIds(), ...fixtures.keys()].sort();
    },
  };
}
