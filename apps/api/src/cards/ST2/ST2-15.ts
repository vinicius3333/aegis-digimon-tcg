import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1, source: "digivolutionCards" },
          from: ["digivolutionCards"],
          payCost: false,
          optional: true,
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "ActivateMain" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST2-15", compiled);
