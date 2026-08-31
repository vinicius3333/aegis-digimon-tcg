// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "By suspending this Digimon, prevent that deletion",
          },
          optional: true,
          actions: [],
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Gabumon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          into: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "allOf",
            conditions: [
              {
                kind: "youHave",
                filter: {
                  controller: "mine",
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Matt Ishida"],
                      match: "name",
                    },
                  ],
                },
                raw: "you have a Tamer with [Matt Ishida] in its name",
              },
              {
                kind: "opponentHas",
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "gte",
                    value: 10000,
                  },
                },
                raw: "your opponent has a Digimon with 10000 DP or more",
              },
            ],
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 3,
          },
          restriction: "suspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ names: ["Gabumon"], cost: 4, isAlternate: true }],
};

registerIrCard("BT15-101", compiled);
export { compiled };
