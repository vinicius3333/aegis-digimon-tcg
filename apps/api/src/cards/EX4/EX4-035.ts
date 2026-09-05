// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
    {
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            excludeSelf: true,
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              amount: 2000,
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Lopmon", "Terriermon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-035", compiled);
