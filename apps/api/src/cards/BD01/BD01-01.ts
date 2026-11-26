import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "DeletionMaxDpModifier",
          amount: 1000,
          scope: "self",
          duration: "permanent",
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD01-01", compiled);
