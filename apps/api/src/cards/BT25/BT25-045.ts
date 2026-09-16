import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "GrantLinkCostReduction",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1,
          whenLinkingTrait: ["Social", "Tool", "Game"],
          duration: "permanent",
          optionalAtDeclaration: true,
          oncePerTurn: true,
        },
      ],
    },
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      colors: ["Green"],
      cost: 0,
      isAlternate: false,
    },
    {
      level: 2,
      cost: 0,
      isAlternate: true,
      traits: ["Appmon"],
    },
  ],
  linkRequirement: [
    {
      cost: 1,
      traits: ["Appmon"],
    },
  ],
};

registerIrCard("BT25-045", compiled);
