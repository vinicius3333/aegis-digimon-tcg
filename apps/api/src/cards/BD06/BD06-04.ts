import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: { controller: "mine", kind: ["Digimon"], suspended: true }, count: "all" },
          effect: { kind: "modifyDP", amount: 1000 },
          raw: "All of your suspended Digimon get +1000 DP",
        },
      ],
    },
    {
      trigger: "AllTurns",
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

registerIrCard("BD06-04", compiled);
