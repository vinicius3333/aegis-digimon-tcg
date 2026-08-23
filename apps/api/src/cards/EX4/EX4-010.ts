// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 3,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 0,
            upTo: true,
            totalDpCap: 3000,
          },
          dpCeiling: 3000,
          totalDpCapScaling: {
            per: 10,
            amount: 2000,
            filter: { zone: "trash", controllerDefault: "both" },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Growlmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-010", compiled);
