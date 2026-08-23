import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX3-062 WarGrowlmon — hand-verified IR. The threshold is evaluated after both
// players mill, so either newly enlarged trash may unlock the optional free play.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 3,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Guilmon", "Takato Matsuki"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          condition: {
            kind: "anyOf",
            conditions: [
              {
                kind: "zoneCount",
                seat: "mine",
                zone: "trash",
                op: "gte",
                value: 5,
                raw: "either player has 5 or more cards in their trash",
              },
              {
                kind: "zoneCount",
                seat: "opponent",
                zone: "trash",
                op: "gte",
                value: 5,
                raw: "either player has 5 or more cards in their trash",
              },
            ],
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Growlmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-062", compiled);
