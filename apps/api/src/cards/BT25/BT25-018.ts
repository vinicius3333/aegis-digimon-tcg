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
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the cost by 5",
              condition: {
                kind: "opponentHas",
                filter: {
                  controllerDefault: "opponent",
                  kind: ["Digimon"],
                  dp: {
                    op: "gte",
                    value: 12000,
                  },
                },
                raw: "your opponent has a Digimon with 12000 DP or more",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
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
          amount: -2000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
          amount: -2000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "DnaDigivolve",
          materials: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
          },
          into: {
            controllerDefault: "mine",
            zone: "hand",
            nameOrTrait: [
              {
                tokens: ["GraceNovamon"],
                match: "name",
              },
            ],
          },
          payCost: true,
          optional: true,
        },
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                relativeToSource: true,
              },
            },
            count: 1,
          },
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
      level: 5,
      traits: ["TS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-018", compiled);
