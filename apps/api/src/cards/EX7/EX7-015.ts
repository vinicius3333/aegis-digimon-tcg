import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "RestrictCostReduction",
          seat: "any",
          costType: "play",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["NSp"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-015", compiled);
