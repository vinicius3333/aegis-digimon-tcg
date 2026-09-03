import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ConditionalBranch",
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
          ifTrue: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [{ tokens: ["Chessmon"], match: "name" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: { kind: "isYourTurn", raw: "it's your turn" },
              optional: true,
            },
          ],
          ifFalse: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 3 },
                  nameOrTrait: [{ tokens: ["Chessmon"], match: "name" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              condition: { kind: "isYourTurn", raw: "it's your turn" },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-035", compiled);
