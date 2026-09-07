import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Flame", "TS"],
                    match: "trait",
                  },
                ],
                zone: "hand",
              },
              count: 1,
            },
            raw: "By trashing 1 [Flame] or [TS] trait card from your hand",
          },
          // Q6258 permits activating this effect with no eligible opposing Digimon. The hand
          // cost is still mandatory, so bypass the generic target preflight and let Delete bind
          // a zero result before the conditional Draw 2.
          allowCostWithoutTarget: true,
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "if this effect didn't delete",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Flame", "TS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-014", compiled);
