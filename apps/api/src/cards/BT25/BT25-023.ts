import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Thomas H. Norstein"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "permanentCount",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            op: "lte",
            value: 1,
            raw: "you have 1 or fewer Tamers",
          },
          optional: true,
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
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Thomas H. Norstein"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "permanentCount",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            op: "lte",
            value: 1,
            raw: "you have 1 or fewer Tamers",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          controller: "mine",
        },
        {
          kind: "Draw",
          amount: 1,
          controller: "opponent",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DATA SQUAD"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-023", compiled);
