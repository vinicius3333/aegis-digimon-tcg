import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: { controllerDefault: "mine" },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the cost by 2",
              condition: {
                kind: "youHave",
                filter: {
                  zone: "battleArea",
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  digivolutionStackNameOrTrait: [{ tokens: ["X Antibody"], match: "name" }],
                },
                raw: "you have a Digimon with [X Antibody] in its digivolution cards in play",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Greymon"], match: "name" }] },
            count: 1,
            bindAs: "budgetDigimon",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: { controller: "opponent", kind: ["Digimon", "Tamer"] },
            count: "all",
            upTo: true,
            totalPlayCostBudgetFromSelectionRef: "budgetDigimon",
          },
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Greymon"], match: "name" }],
            },
            count: 1,
          },
          optional: true,
          attackPlayer: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "highestPlayCost" }, count: 1 },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-107", compiled);
