import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          mode: "instead",
          leaveCause: "byBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "gte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "CostGatedBlock",
              cost: {
                kind: "suspend",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
                raw: "by suspending this Tamer",
              },
              optional: true,
              abortOnDecline: true,
              actions: [
                {
                  kind: "PlayWithoutCost",
                  target: {
                    filter: {
                      controller: "mine",
                      kind: ["Digimon"],
                      levelComparison: {
                        op: "lte",
                        value: 4,
                      },
                      zone: "digivolutionCards",
                      hostFilter: { sourceRef: "triggerSubject" },
                    },
                    count: 1,
                  },
                  from: ["digivolutionCards"],
                  payCost: false,
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          kind: "Attack",
          attacker: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Free"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-084", compiled);
