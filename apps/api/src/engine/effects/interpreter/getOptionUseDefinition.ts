import type { CardDefinition } from "@aegis/shared/cards/types";

export function getOptionUseDefinition(definition: CardDefinition): CardDefinition {
  return definition.isDualCard && definition.optionColorRequirements !== undefined
    ? { ...definition, colors: definition.optionColorRequirements }
    : definition;
}
