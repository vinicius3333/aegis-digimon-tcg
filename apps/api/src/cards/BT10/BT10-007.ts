import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      traits: ["Xros Heart"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-007", compiled);
