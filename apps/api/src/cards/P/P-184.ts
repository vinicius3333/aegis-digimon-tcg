import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] This Digimon gets +3000 DP until your opponent's turn ends.",
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
            "Then, if [Kosuke Kisakata] is in this Digimon's digivolution cards, all of your Digimon with the [SoC] trait unsuspend.",
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["SoC"],
                  match: "trait",
                },
              ],
            },
            count: "all",
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Kosuke Kisakata"],
                  match: "nameExact",
                },
              ],
            },
            raw: "[Kosuke Kisakata] is in this Digimon's digivolution cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["DoruGreymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["SoC"],
      cost: 3,
      isAlternate: true,
      level: 5,
    },
  ],
};

registerIrCard("P-184", compiled);
