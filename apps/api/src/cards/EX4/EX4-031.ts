// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The printed "2-color w/green" gate is carried as multicolor:true + colors:['Green'] plus
// colorCount:2, consumed by the shared requirement matcher as an exact color cardinality gate.
// text in the printed effectText is the rules reminder for Alliance, not a separate effect).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
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
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              zone: "battleArea",
              suspended: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
          scaling: {
            per: 1,
            filter: {
              controller: "mine",
              zone: "battleArea",
              suspended: true,
              kind: ["Digimon"],
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      multicolor: true,
      colorCount: 2,
      colors: ["Green"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-031", compiled);
