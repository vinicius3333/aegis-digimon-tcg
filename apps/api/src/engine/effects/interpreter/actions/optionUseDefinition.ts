import type { CardDefinition } from "@aegis/shared";

export function optionUseDefinition(definition: CardDefinition): CardDefinition {
  return definition.isDualCard && definition.optionColorRequirements !== undefined
    ? { ...definition, colors: definition.optionColorRequirements }
    : definition;
}
