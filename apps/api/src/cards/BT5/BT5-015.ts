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
              dp: {
                op: "lte",
                value: 4000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["MetalGreymon"],
                  match: "name",
                },
              ],
            },
            raw: "a Digimon card with [MetalGreymon] in its name is in this Digimon's digivolution cards",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "modifyDP",
            amount: 2000,
          },
          while: {
            kind: "allOf",
            conditions: [
              { kind: "selfHasNameContaining", names: ["Omnimon", "Greymon"] },
              {
                kind: "not",
                condition: {
                  kind: "selfHasName",
                  names: ["DoruGreymon", "BurningGreymon", "DexDoruGreymon"],
                },
              },
            ],
            raw: "this Digimon has [Omnimon] or [Greymon] other than [DoruGreymon], [BurningGreymon], or [DexDoruGreymon] in its name",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-015", compiled);
