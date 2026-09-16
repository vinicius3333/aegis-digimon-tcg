import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 [Dorumon]/[Ryudamon] from your hand to your empty breeding area without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dorumon", "Ryudamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          breeding: true,
          requiresEmpty: "breedingArea",
        },
        {
          effectTextPart:
            "Then, if during an attack, until the end of your opponent's turn, 1 of your Digimon gains ＜Security A. +1＞ and gets +5000 DP.",
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            bindAs: "hisyaryumonBoostTarget",
          },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "duringAttack", raw: "during an attack" },
        },
        {
          effectTextPart:
            "Then, if during an attack, until the end of your opponent's turn, 1 of your Digimon gains ＜Security A. +1＞ and gets +5000 DP.",
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "hisyaryumonBoostTarget" },
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "duringAttack", raw: "during an attack" },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] You may play 1 [Dorumon]/[Ryudamon] from your hand to your empty breeding area without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Dorumon", "Ryudamon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          breeding: true,
          requiresEmpty: "breedingArea",
        },
        {
          effectTextPart:
            "Then, if during an attack, until the end of your opponent's turn, 1 of your Digimon gains ＜Security A. +1＞ and gets +5000 DP.",
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            bindAs: "hisyaryumonBoostTarget",
          },
          keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
          duration: "untilOpponentTurnEnd",
          condition: { kind: "duringAttack", raw: "during an attack" },
        },
        {
          effectTextPart:
            "Then, if during an attack, until the end of your opponent's turn, 1 of your Digimon gains ＜Security A. +1＞ and gets +5000 DP.",
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "hisyaryumonBoostTarget" },
          amount: 5000,
          duration: "untilOpponentTurnEnd",
          condition: { kind: "duringAttack", raw: "during an attack" },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: {
            kind: "PreventSecurityActivation",
            cardType: "Option",
          },
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Ginryumon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["Chronicle"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-015", compiled);
