import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "MaterialSave",
          amount: 1,
          raw: "＜Material Save 1＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon", "Tamer"],
              playCostLte: 3,
            },
            count: 1,
          },
          condition: {
            kind: "digiXrosCount",
            minimum: 2,
            raw: "DigiXrosing with 2 cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon", "Tamer"],
              playCostLte: 3,
            },
            count: 1,
          },
          condition: {
            kind: "digiXrosCount",
            minimum: 2,
            raw: "DigiXrosing with 2 cards",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Knightmon"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["underMyTamers"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Knightmon"],
                  match: "text",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [{ names: ["SkullKnightmon"] }, { names: ["DeadlyAxemon"] }],
      count: 2,
    },
  ],
};

registerIrCard("BT19-063", compiled);
