import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
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
      names: ["Ginryumon"],
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
