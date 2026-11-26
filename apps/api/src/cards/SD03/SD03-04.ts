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
          cost: {
            kind: "suspend",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            raw: "By suspending this Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Piercing", raw: "＜Piercing＞" } },
          while: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["ALYSION"], match: "trait" }] },
            raw: "this Digimon with the [ALYSION] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD03-04", compiled);
