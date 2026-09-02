import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Tamer"],
            colors: ["Red"],
          },
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
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
                value: 3000,
              },
            },
            count: 1,
          },
          condition: {
            kind: "selfDpAtLeast",
            value: 6000,
            raw: "this Digimon has 6000 DP or more",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-008", compiled);
