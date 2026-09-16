import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "dpDeletion",
          amount: 1000,
          target: {
            filter: { controller: "mine" },
            count: "all",
          },
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Growlmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-011", compiled);
