import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By returning 1 Digimon card from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By returning 1 Digimon card from your opponent's trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-061", compiled);
