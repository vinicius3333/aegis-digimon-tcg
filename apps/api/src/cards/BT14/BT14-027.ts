// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
              levels: [3],
            },
            count: "all",
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "any",
              kind: ["Digimon"],
              levels: [3],
            },
            count: "all",
          },
          to: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-027", compiled);
