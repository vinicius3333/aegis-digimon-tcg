import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Return 1 of your opponent's Digimon to the hand.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          effectTextPart: "Then, gain 1 memory for every 4 cards in your opponent's hand.",
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 4,
            filter: {
              zone: "hand",
              controller: "opponent",
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-105", compiled);
