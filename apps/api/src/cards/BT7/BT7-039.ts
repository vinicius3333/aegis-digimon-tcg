// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
              levelComparison: { op: "lte", value: 4 },
            },
            from: ["hand"],
            count: 2,
            upTo: true,
          },
          underFilter: { isSelfRef: true },
          position: "bottom",
          order: "any",
          optional: true,
          trackCount: "stefilmonPlaced",
          condition: { kind: "selfDigivolutionCountExactly", value: 1 },
        },
        {
          kind: "Draw",
          amount: 1,
          scaling: { per: 1, unit: "namedCount", countSource: "stefilmonPlaced" },
          condition: { kind: "namedCountAtLeast", countSource: "stefilmonPlaced", count: 1 },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigiBurstCardDiscarded",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
              keyword: { keyword: "SecurityAttack", amount: 1 },
              duration: "forTheTurn",
            },
          ],
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-039", compiled);
