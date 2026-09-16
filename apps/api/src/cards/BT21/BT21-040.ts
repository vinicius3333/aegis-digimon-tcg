import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["ShineGreymon"],
                match: "nameExact",
              },
            ],
          },
          payCost: true,
          from: ["hand"],
          costOverride: 4,
          ignoreRequirements: true,
          optional: true,
          condition: {
            kind: "orConditions",
            conditions: [
              {
                kind: "opponentHas",
                filter: {
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "gte",
                    value: 6,
                  },
                },
              },
              {
                kind: "permanentCount",
                seat: "mine",
                filter: {
                  kind: ["Tamer"],
                  nameOrTrait: [
                    {
                      tokens: ["Hero"],
                      match: "trait",
                    },
                  ],
                  distinctNames: true,
                },
                op: "gte",
                value: 3,
              },
            ],
            raw: "your opponent has a level 6 or higher Digimon or you have 3 or more [Hero] trait Tamers with different names",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Koromon"],
      cost: 0,
      isAlternate: true,
    },
    {
      level: 2,
      traits: ["Hero"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-040", compiled);
