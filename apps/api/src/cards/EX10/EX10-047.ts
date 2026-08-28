// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play]: By trashing 1 card in your hand, delete up to 6000 DP total worth of your
//   opponent's Digimon. Uses DeleteByDPBudget (DP-budget deletion, not play-cost).
// [On Deletion]: Play 1 Tamer card with [Myotismon] in its text from trash without cost.
//   This effect can't play cards with the same name as any of your Tamers.
//   (excludeSameNameAsOwnTamers restriction — same pattern as BT24-034.)
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "DeleteByDPBudget",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
          },
          baseBudget: 6000,
          upTo: true,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
              },
              count: 1,
            },
            raw: "By trashing 1 card in your hand",
          },
          optional: true,
          abortOnDecline: true,
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
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Myotismon"],
                  match: "text",
                },
              ],
              excludeSameNameAsOwnTamers: true,
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX10-047", compiled);

export { compiled };
