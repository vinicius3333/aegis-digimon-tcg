import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }],
            },
            count: 1,
          },
          attackTargetScope: "digimon",
          optional: true,
        },
        {
          kind: "Return",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 6000 } },
            count: 0,
            countModifier: {
              amount: 1,
              scaling: {
                per: 1,
                filter: { controller: "mine", zone: "battleArea", kind: ["Digimon"], suspended: true },
                unit: "cards",
              },
            },
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
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
          from: ["hand", "trash"],
          payCost: false,
          suspended: true,
          optional: true,
        },
        { kind: "AddToHandSelf" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD03-07", compiled);
