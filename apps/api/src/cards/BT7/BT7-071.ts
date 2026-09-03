import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4649: cannot choose NOT to digivolve after declaring.
// KB Q1627: can also digivolve onto a level 3 Digimon normally.
// The Static effect block mirrors the BT4-025 (Lobomon) established pattern
// for Tamer-onto digivolve; asLevel:3 treats the purple Tamer as level 3.
// The digivolutionRequirement captures the alternate-base legality check.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Purple"] }, count: 1 },
          payCost: true,
          asLevel: 3,
          from: ["hand"],
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
      baseColors: ["Purple"],
    },
  ],
};

registerIrCard("BT7-071", compiled);
