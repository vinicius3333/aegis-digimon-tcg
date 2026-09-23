import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          restriction: "beReturned",
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "[When Digivolving] Until the end of your opponent's turn, this Digimon can't be returned to the hand or deck and it gets +3000 DP.",
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, if [WarGrowlmon]/[X Antibody] is in this Digimon's digivolution cards, delete 1 of your opponent's Digimon with 10000 DP or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 10000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "selfDigivolutionStackMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "nameExact" }] },
              },
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "nameExact" }] },
              },
            ],
            raw: "[WarGrowlmon]/[X Antibody] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["WarGrowlmon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-015", compiled);
