import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4643: cannot choose NOT to digivolve after declaring.
// KB Q1553: can also digivolve onto a level 3 Digimon normally.
// The Static effect block mirrors the BT4-025 (Lobomon) established pattern
// for Tamer-onto digivolve; asLevel:3 treats the yellow Tamer as level 3.
// The digivolutionRequirement captures the alternate-base legality check.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Yellow"],
            },
            count: 1,
          },
          asLevel: 3,
          from: ["hand"],
          payCost: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 2,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Yellow"],
    },
  ],
};
registerIrCard("BT7-035", compiled);
