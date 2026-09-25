import { hasCardDefinition, setExtraCardDefinitions, type CardDefinition } from "@aegis/shared";

/** Test-only card definitions. Never mutates the production catalog or real definitions. */
class SyntheticDefinitions extends Map<string, CardDefinition> {
  override set(cardId: string, definition: CardDefinition): this {
    if (!this.has(cardId) && hasCardDefinition(cardId)) {
      throw new Error(`Synthetic fixture must not replace a real card: ${cardId}`);
    }
    return super.set(cardId, definition);
  }
}

// Shared across test files because the serial Vitest worker reuses its module graph.
export const syntheticDefinitions = new SyntheticDefinitions();
setExtraCardDefinitions(syntheticDefinitions);
