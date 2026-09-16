import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Red", "Black"],
              playCostLte: 4,
            },
            orFilters: [
              {
                controllerDefault: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["CS"],
                    match: "trait",
                  },
                ],
              },
            ],
            count: 1,
          },
          payCost: false,
          optional: true,
          condition: {
            kind: "permanentCount",
            seat: "mine",
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            op: "lte",
            value: 1,
            raw: "you have 1 or fewer Tamers",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
};

registerIrCard("BT22-012", compiled);
