import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Knightmon"],
                    match: "name",
                  },
                  {
                    tokens: ["DeadlyAxemon"],
                    match: "name",
                  },
                ],
              },
              orFilters: [
                {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Nene Amano"],
                      match: "name",
                    },
                  ],
                },
              ],
              count: 1,
              to: "hand",
            },
          ],
          rest: "trash",
        },
        {
          effectTextPart:
            "Then, if DigiXrosing with 2 cards, delete 1 of your opponent's Digimon with a play cost of 4 or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
            },
            count: 1,
          },
          condition: {
            kind: "digiXrosCount",
            minimum: 2,
          },
        },
      ],
    },
    {
      trigger: "Rule",
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
          grant: "name",
          tokens: ["SkullKnightmon", "DeadlyAxemon"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digiXrosRequirement: [
    {
      materials: [
        {
          names: ["SkullKnightmon"],
        },
        {
          names: ["DeadlyAxemon"],
        },
      ],
      count: 1,
    },
  ],
};

registerIrCard("BT10-061", compiled);
