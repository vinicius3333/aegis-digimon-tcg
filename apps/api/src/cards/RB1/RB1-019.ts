import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          source: {
            filter: { controller: "mine", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
            count: "all",
          },
          toTop: true,
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "opponent",
          source: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "eq", value: 3 } },
            count: "all",
          },
          toTop: true,
        },
        {
          effectTextPart:
            "Then, all of your opponent’s level 4 or higher Digimon get -3000 DP and gain ＜Security Attack -1＞ until the end of their turn.",
          kind: "ModifyDP",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 4 } },
            count: "all",
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, all of your opponent’s level 4 or higher Digimon get -3000 DP and gain ＜Security Attack -1＞ until the end of their turn.",
          kind: "GainKeyword",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 4 } },
            count: "all",
          },
          keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "opponent",
          source: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          toTop: false,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                controller: "mine",
                nameOrTrait: [{ tokens: ["Numemon"], match: "name" }],
              },
              count: 1,
            },
            raw: "By trashing 1 card with [Numemon] in its name in this Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, names: ["Monzaemon", "Numemon"], cost: 4, isAlternate: true }],
};

registerIrCard("RB1-019", compiled);
