import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "RestrictCostReduction",
          seat: "opponent",
          costType: "digivolve",
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
      traits: ["ADVENTURE"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST20-07", compiled);
