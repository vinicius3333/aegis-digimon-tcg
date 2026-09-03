import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RestrictPlay",
          seat: "opponent",
          filter: {
            kind: ["Digimon", "Tamer"],
          },
          mode: "play",
          byEffectOnly: true,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Imperialdramon: Dragon Mode"],
                  match: "name",
                },
              ],
            },
            raw: "[Imperialdramon: Dragon Mode] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    relativeToSource: true,
                  },
                },
                count: 1,
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Imperialdramon: Dragon Mode"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-020", compiled);
