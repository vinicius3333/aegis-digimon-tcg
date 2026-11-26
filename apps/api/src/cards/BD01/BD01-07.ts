import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD01-07", compiled);
