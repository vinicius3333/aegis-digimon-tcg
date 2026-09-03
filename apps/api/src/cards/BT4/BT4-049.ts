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
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: -4000,
          duration: "forTheTurn",
          cost: {
            kind: "trash",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
              },
              count: 3,
            },
            raw: "＜Digi-Burst 3＞",
          },
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 3,
          raw: "＜Digi-Burst 3＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-049", compiled);
