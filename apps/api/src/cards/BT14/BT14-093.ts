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
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Patamon"], match: "name" }] }, count: 1 },
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
