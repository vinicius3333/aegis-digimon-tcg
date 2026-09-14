import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. (Trash 1 card from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards.)",
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
          effectTextPart:
            "Then, you may place 1 card with [X-Antibody] in its traits from your hand as the bottom digivolution card of 1 of your black Digimon with [X-Antibody] in its traits to delete 1 of your opponent's Digimon with a play cost of 4 or less.",
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["X-Antibody"],
                  match: "trait",
                },
              ],
            },
            from: ["hand"],
            count: 1,
          },
          underFilter: {
            controller: "mine",
            colors: ["Black"],
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["X-Antibody"],
                match: "trait",
              },
            ],
          },
          position: "bottom",
          optional: true,
        },
        {
          effectTextPart:
            "Then, you may place 1 card with [X-Antibody] in its traits from your hand as the bottom digivolution card of 1 of your black Digimon with [X-Antibody] in its traits to delete 1 of your opponent's Digimon with a play cost of 4 or less.",
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
            kind: "ifThisEffectActed",
            raw: "PlaceUnder resolved",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart: "[Security] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
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
          effectTextPart: "Then, delete 1 of your opponent's Digimon with a play cost of 4 or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 4,
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

registerIrCard("BT8-104", compiled);
