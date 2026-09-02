import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Mamemon"],
                    match: "name",
                  },
                ],
              },
              count: "all",
              costBudget: 15,
              to: "play",
              optional: true,
            },
          ],
          rest: "trash",
          trackPlayedCount: "mamemonPlayed",
        },
        {
          kind: "RepeatPerCount",
          countSource: "mamemonPlayed",
          action: {
            kind: "Delete",
            target: {
              filter: {
                controller: "opponent",
                kind: ["Digimon"],
                playCostLte: 6,
              },
              count: 1,
            },
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

registerIrCard("BT8-106", compiled);
