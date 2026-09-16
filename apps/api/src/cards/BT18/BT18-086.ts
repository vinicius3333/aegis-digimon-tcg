import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "nameExact",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Lucemon: Satan Mode"],
                match: "name",
              },
            ],
          },
          mode: "prevent",
          actions: [{ kind: "MovePermanent", direction: "toBattle" }],
          optional: true,
        },
      ],
      isBreeding: true,
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: { op: "eq", value: 0 },
            },
            count: "all",
          },
          effect: {
            kind: "restriction",
            restriction: "beDeleted",
          },
          while: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              excludeColors: ["White"],
              nameOrTrait: [
                {
                  tokens: ["Lucemon"],
                  match: "name",
                },
              ],
            },
            raw: "you have a non-white Digimon with [Lucemon] in its name",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-086", compiled);
