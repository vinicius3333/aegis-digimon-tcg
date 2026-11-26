import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          fromTop: false,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD02-01", compiled);
