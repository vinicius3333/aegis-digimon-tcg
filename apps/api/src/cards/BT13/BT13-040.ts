import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  or: [
                    {
                      zone: "hand",
                      nameOrTrait: [{ tokens: ["Veemon"], match: "nameExact" }],
                    },
                    {
                      zone: "digivolutionCards",
                      nameOrTrait: [{ tokens: ["Veemon"], match: "nameExact" }],
                      hostFilter: { isSelfRef: true },
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand", "digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Veemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT13-040", compiled);
