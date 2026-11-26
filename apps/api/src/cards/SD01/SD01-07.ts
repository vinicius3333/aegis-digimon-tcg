import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            count: 1,
          },
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "AddToHandSelf" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD01-07", compiled);
