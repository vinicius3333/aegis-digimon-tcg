import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "CostModifier",
          mode: "raiseCeiling",
          costType: "level",
          amount: 2,
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          duration: "forTheTurn",
          condition: {
            kind: "youHave",
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Chessmon"], match: "name" }],
            },
            count: 8,
            raw: "you have 8 or more Digimon cards with [Chessmon] in their names in your trash",
          },
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 3,
              },
              nameOrTrait: [
                {
                  tokens: ["Chessmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "isOpponentsTurn",
            raw: "it's your opponent's turn",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-064", compiled);
