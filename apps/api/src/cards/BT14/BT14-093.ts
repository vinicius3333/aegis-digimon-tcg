import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          searchZone: "security",
          count: 1,
          filter: {
            zone: "security",
            controller: "mine",
            kind: ["Digimon"],
            colors: ["Yellow"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }],
          },
        },
        {
          effectTextPart:
            "[Main] Search your security stack. 1 of your Digimon may digivolve into 1 yellow level 6 or lower Digimon card with the [Vaccine] trait among them without paying the cost.",
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          from: ["security"],
          amongPreviousSearch: true,
          payCost: false,
          optional: true,
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            colors: ["Yellow"],
            levelComparison: { op: "lte", value: 6 },
            nameOrTrait: [{ tokens: ["Vaccine"], match: "trait" }],
          },
        },
        { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "ifThisEffectDigivolved" },
          postCostCondition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["T.K. Takaishi"], match: "name" }],
            },
          },
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          effectTextPart: "[Security] You may play 1 [Patamon] from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", nameOrTrait: [{ tokens: ["Patamon"], match: "nameExact" }] },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT14-093", compiled);
