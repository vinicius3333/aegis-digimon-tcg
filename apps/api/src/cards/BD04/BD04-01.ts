import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "anyOf",
            conditions: [
              { kind: "selfHasNameContaining", names: ["Leomon"] },
              { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Boss"], match: "trait" }] } },
            ],
            raw: "this Digimon has [Leomon] in its name or the [Boss] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD04-01", compiled);
