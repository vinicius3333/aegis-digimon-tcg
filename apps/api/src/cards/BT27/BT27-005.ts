import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Black"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT27-005", compiled);
