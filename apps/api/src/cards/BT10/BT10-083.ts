// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Compiled effect IR for BT10-083.
// Fix vs auto-generated: "play 1 purple level 5 or lower Digimon card or 1
// [Mervamon]" is a within-target union (any purple level<=5 Digimon, OR any
// Mervamon regardless of color/level), not a single filter requiring both
// purple AND named Mervamon. Uses `orFilters` for the alternative, same as
// BT17-074.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Retaliation",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Purple"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                count: 1,
              },
              from: ["trash"],
              payCost: false,
              suppressOnPlayEffects: true,
              optional: true,
            },
          ],
          raw: "whenPlayed",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Mervamon"],
                    match: "name",
                  },
                ],
              },
            ],
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "battleArea",
            op: "lte",
            value: 2,
            filter: {
              kind: ["Digimon"],
            },
            raw: "your opponent has 2 or fewer Digimon in play",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-083", compiled);
