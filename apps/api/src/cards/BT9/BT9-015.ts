// HAND-FIXED — preserve: the +3000 DP gate matches card NAMES in the live stack, not traits.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: 1,
            raw: "＜Security Attack +1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "untilOpponentNextTurnEnd",
          condition: {
            kind: "selfHasInDigivolutionCards",
            nameOrTrait: [
              {
                tokens: ["MetalGreymon", "X Antibody"],
                match: "nameExact",
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["MetalGreymon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-015", compiled);
