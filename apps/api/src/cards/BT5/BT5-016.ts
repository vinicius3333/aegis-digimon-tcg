// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
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
              excludeNames: ["DoruGreymon", "BurningGreymon", "DexDoruGreymon"],
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
