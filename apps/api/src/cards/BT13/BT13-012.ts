import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              colors: ["Red", "Yellow"],
            },
            count: 1,
          },
          from: ["security"],
          payCost: false,
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectActed",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Red", "Yellow"],
          },
          actions: [
            {
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "lte",
                    value: 3000,
                  },
                },
                count: 1,
              },
              optional: true,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Agumon"],
      traits: ["Dinosaur"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT13-012", compiled);
