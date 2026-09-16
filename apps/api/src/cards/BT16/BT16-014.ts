import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
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
          ignorePlayCostLimit: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [
                { tokens: ["God Flame"], match: "nameExact" },
                { tokens: ["Four Great Dragons"], match: "trait" },
              ],
            },
            count: 1,
            forceSelection: true,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          ignorePlayCostLimit: true,
          target: {
            filter: {
              controller: "mine",
              kind: ["Option"],
              nameOrTrait: [
                { tokens: ["God Flame"], match: "nameExact" },
                { tokens: ["Four Great Dragons"], match: "trait" },
              ],
            },
            count: 1,
            forceSelection: true,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "effects",
          filter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Goldramon"],
                match: "name",
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Goldramon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-014", compiled);
export { compiled };
