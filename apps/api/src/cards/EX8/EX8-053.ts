// @ts-nocheck
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
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 5000,
          },
          while: {
            kind: "opponentHas",
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "gte",
                value: 13000,
              },
            },
            raw: "your opponent has a Digimon with 13000 DP or more",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                playCostLte: 8,
                nameOrTrait: [
                  {
                    tokens: ["Mineral", "Rock"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "trash",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX8-053", compiled);
