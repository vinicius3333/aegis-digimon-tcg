import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              dp: { op: "lte", value: 3000 },
              nameOrTrait: [{ tokens: ["Vegetation", "ALYSION"], match: "trait" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          suspended: true,
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: {
            kind: "ifThisEffectActed",
            raw: "by playing 1 3000 DP or lower Digimon card with the [Vegetation] or [ALYSION] trait from your hand suspended without paying the cost",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: { controller: "mine", kind: ["Digimon"], suspended: true, excludeSelf: true },
            count: "all",
          },
          effect: { kind: "modifyDP", amount: 2000 },
          raw: "All of your other suspended Digimon get +2000 DP",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD06-06", compiled);
