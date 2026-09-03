// HAND-FIXED IR — returning each Digimon already trashes only that returned Digimon's sources.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 3,
            upTo: true,
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-095", compiled);
