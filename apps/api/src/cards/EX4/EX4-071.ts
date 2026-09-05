// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                relativeTo: "lastDeleted",
              },
            },
            count: 1,
          },
          cost: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            bindResultAs: "deleted",
            raw: "By deleting 1 of your Digimon",
          },
        },
        {
          kind: "SubTrigger",
          event: "endOfOpponentTurn",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  nameOrTrait: [
                    {
                      tokens: ["Ravemon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
                location: "trash",
                controller: "mine",
              },
              from: ["trash"],
              payCost: false,
            },
          ],
          condition: {
            kind: "bindingContains",
            ref: "deleted",
            filter: { nameOrTrait: [{ tokens: ["Ravemon"], match: "name" }] },
            raw: "one of your Digimon with [Ravemon] in its name was deleted by this effect",
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: 1,
          },
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX4-071", compiled);
