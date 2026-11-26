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
        },
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          restriction: "unsuspendDuringOwnUnsuspendPhase",
          duration: "untilOpponentNextUnsuspendPhase",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", kind: ["Digimon"] },
          actions: [
            {
              kind: "Suspend",
              target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("SD03-05", compiled);
