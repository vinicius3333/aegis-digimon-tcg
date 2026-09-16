import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: {
            controllerDefault: "mine",
            isSelfRef: true,
            suspended: true,
            kind: ["Digimon"],
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levels: [6],
            nameOrTrait: [
              {
                tokens: ["Plant", "Vegetation"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the digivolution cost by 2",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-051", compiled);
