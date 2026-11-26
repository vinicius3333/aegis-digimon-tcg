import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 1000 },
          while: {
            kind: "allOf",
            conditions: [
              { kind: "selfIsSuspended" },
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] } },
            ],
            raw: "this suspended Digimon with the [ALYSION] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD03-01", compiled);
