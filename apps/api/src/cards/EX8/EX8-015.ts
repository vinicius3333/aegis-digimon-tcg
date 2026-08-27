// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
                filter: { nameOrTrait: [{ tokens: ["WarGrowlmon"], match: "name" }] },
              },
              {
                kind: "selfDigivolutionStackHasTrait",
                filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "trait" }] },
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
