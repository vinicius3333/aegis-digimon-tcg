// HAND-FIXED IR — the printed effect plays up to 2 cards and suppresses their On Play effects.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 2,
            upTo: true,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          suppressOnPlayEffects: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT2-080", compiled);
