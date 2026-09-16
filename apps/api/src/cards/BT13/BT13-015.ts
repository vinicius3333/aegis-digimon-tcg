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
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Marcus Damon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Red", "Yellow"],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: {
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Marcus Damon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              toTop: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Red", "Yellow"],
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: {
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Marcus Damon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["trash"],
              toTop: true,
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
      namesExact: ["GeoGreymon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT13-015", compiled);
