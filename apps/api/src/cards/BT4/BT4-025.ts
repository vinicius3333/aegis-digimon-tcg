// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Digivolve",
          onto: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Blue"],
            },
            count: 1,
          },
          asLevel: 3,
          from: "hand",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 0,
      isAlternate: true,
      baseIsTamer: true,
    },
  ],
};

registerIrCard("BT4-025", compiled);
