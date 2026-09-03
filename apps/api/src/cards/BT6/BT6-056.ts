import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The Security effect arms its De-Digivolve at the end of the Security battle;
// it must not resolve while Chikurimon is merely being checked/revealed.
// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      timing: "endOfBattle",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityBattleEnded",
          once: true,
          actions: [
            {
              kind: "DeDigivolve",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 1,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-056", compiled);
