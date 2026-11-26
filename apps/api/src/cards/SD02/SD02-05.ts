import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          duration: "permanent",
          defenderHasFewerDigivolutionCards: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: {
            keyword: "IceClad",
            raw: "Other than against Security Digimon, compare the number of digivolution cards instead of DP in this Digimon's battles.",
          },
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD02-05", compiled);
