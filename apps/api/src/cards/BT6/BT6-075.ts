import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 2,
            requiredNamesExactUpTo: ["Kinkakumon", "Ginkakumon"],
          },
          from: ["trash"],
          order: "any",
          optional: true,
          trackCount: "bt6-075-placed",
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "bt6-075-placed",
            count: 2,
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "bt6-075-placed",
            count: 2,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-075", compiled);
