import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            or: [
              {
                nameOrTrait: [
                  {
                    tokens: ["Plug-In"],
                    match: "name",
                  },
                ],
              },
              {
                colors: ["Yellow"],
              },
            ],
          },
          payCost: true,
          reduceCostBy: 2,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            playCostLte: 99,
            or: [
              {
                nameOrTrait: [
                  {
                    tokens: ["Plug-In"],
                    match: "name",
                  },
                ],
              },
              {
                colors: ["Yellow"],
              },
            ],
          },
          payCost: true,
          reduceCostBy: 2,
          from: ["hand"],
          optional: true,
          condition: {
            kind: "selfHasNameContaining",
            names: ["Sakuyamon"],
            raw: "this Digimon has [Sakuyamon] in its name",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-035", compiled);
