import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT9-014 WarGrowlmon (X Antibody)
// effectText: Digivolve: 0 from [WarGrowlmon]
//   [When Digivolving] Until the end of your opponent's turn, 2 of their Digimon gain
//     "[On Deletion] Lose 1 memory." Then, if [WarGrowlmon] or [X Antibody] is in this
//     Digimon's digivolution cards, you may choose any number of your opponent's Digimon
//     whose total DP adds up to 6000 or less and delete them.
//
// KB Q1807: [WarGrowlmon] and [X Antibody] are NAME matches (not trait).
//
// Fixes:
// 1. GrantAuraToOpponents: effectText was a token; replaced with explicit event+actions
//    encoding "[On Deletion] Lose 1 memory" (opponent loses 1 memory when the aura'd
//    Digimon is deleted). Event: "onDeletionOf" fires when the anchored permanent
//    is deleted. GainMemory { amount: -1 } from the perspective of the aura anchor's
//    owner (opponent) = the opponent loses 1 memory.
// 2. Delete: DeleteByDPBudget asks for any combination whose live DP total is at most
//    the stated budget. The name-only stack condition is preserved on the action.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
          },
          event: "onDeletionOf",
          actions: [
            {
              kind: "GainMemory",
              amount: -1,
            },
          ],
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DeleteByDPBudget",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            upTo: true,
          },
          baseBudget: 6000,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["WarGrowlmon", "X Antibody"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[WarGrowlmon] or [X Antibody] is in this Digimon's digivolution cards",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["WarGrowlmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-014", compiled);
