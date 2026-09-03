import type { Action, CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const actions: Action[] = [
  {
    kind: "ModifyDP",
    target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    amount: -3000,
    duration: "untilOpponentTurnEnd",
    cost: {
      kind: "trash",
      target: {
        filter: {
          zone: ["hand", "digivolutionCards"],
          controller: "mine",
          nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
          hostFilter: { isSelfRef: true },
        },
        count: 1,
      },
      raw: "By trashing 1 card with [Sukamon] in its name in your hand or in this Digimon's digivolution cards",
    },
    alsoGainKeywords: [{ keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" }],
    optional: true,
    abortOnDecline: true,
  },
];
export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions },
    { trigger: "OnPlay", actions },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    // "other Digimon" has no controller restriction. Q2075 explicitly
                    // permits the opponent's Sukamon, but a friendly one is legal too.
                    controller: "any",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Sukamon"], match: "name" }],
                  },
                  count: 1,
                },
                raw: "by deleting 1 other Digimon with [Sukamon] in its name",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 4, names: ["Sukamon"], cost: 3, isAlternate: true }],
};
registerIrCard("BT11-041", compiled);
