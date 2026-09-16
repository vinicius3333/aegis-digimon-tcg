import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDiscardSecurity",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: "all",
          },
          amount: -5000,
          duration: "untilYourTurnEnd",
        },
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -5000,
          duration: "untilYourTurnEnd",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Search your security stack. You may play 1 yellow level 4 or lower Digimon card among it without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["security"],
          payCost: false,
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "mine",
          toTop: true,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Kari Kamiya"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Tamer with [Kari Kamiya] in its name",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -5000,
          duration: "untilYourTurnEnd",
        },
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -5000,
          duration: "untilYourTurnEnd",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-092", compiled);
