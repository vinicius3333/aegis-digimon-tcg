import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              keywords: ["Blocker"],
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              excludeNameOrTrait: [
                { tokens: ["DoruGreymon"], match: "nameExact" },
                { tokens: ["BurningGreymon"], match: "nameExact" },
                { tokens: ["DexDoruGreymon"], match: "nameExact" },
              ],
              nameOrTrait: [
                {
                  tokens: ["Greymon"],
                  match: "name",
                },
              ],
            },
            raw: "a Digimon card with [Greymon] in its name other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon] is in this Digimon's digivolution cards",
          },
        },
      ],
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
                value: 3000,
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
};

registerIrCard("BT5-016", compiled);
