import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
