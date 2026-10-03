import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Return 2 of your opponent's level 4 or lower Digimon to their owners' hands.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 2,
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, if your opponent has 8 or more cards in their hand, return 1 of your opponent's level 6 or higher Digimon to the bottom of its owner's deck.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: 6,
              },
            },
            count: 1,
          },
          to: "deckBottom",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 8,
            raw: "your opponent has 8 or more cards in their hand",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-067", compiled);
