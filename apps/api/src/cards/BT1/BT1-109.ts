// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolve",
          amount: 4,
          target: {
            filter: { zone: "battleArea", controller: "mine", kind: ["Digimon"], colors: ["Green"], levels: [5] },
          },
          into: { zone: "hand", controller: "mine", kind: ["Digimon"], colors: ["Green"], levels: [6] },
          duration: "forTheTurn",
          once: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT1-109", compiled);
export default compiled;
