import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "TamerOntoDigivolve",
          onto: {
            controller: "mine",
            kind: ["Tamer"],
            colors: ["Blue"],
          },
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
      cost: 0,
      isAlternate: true,
      baseIsTamer: true,
    },
  ],
};

registerIrCard("BT4-025", compiled);
