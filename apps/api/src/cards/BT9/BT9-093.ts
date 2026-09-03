import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-093 Flare Rock Soul
// effectText: [Main] Delete 1 of your opponent's Digimon with 5000 DP or less.
//   Then, you may digivolve 1 of your Digimon into a Digimon card with [Shoutmon]
//   in its name in your hand for its digivolution cost.
// [Security] Delete 1 of your opponent's Digimon with 5000 DP or less.
//
// KB Q1896: cannot ignore digivolution requirements.
// Fixes: into filter was raw string — replaced with proper Filter struct; payCost:true;
// ignoreRequirements:false (explicit per KB).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Shoutmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          ignoreRequirements: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-093", compiled);
