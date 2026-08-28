// @ts-nocheck
// HAND-FIXED IR — do not regenerate over this file.
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
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Piercing", raw: "＜Piercing＞" },
          duration: "permanent",
        },
        {
          kind: "Digivolve",
          onto: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Green"],
            },
            count: 1,
          },
          asLevel: 3,
          from: "hand",
        },
      ],
      keywords: [
        {
          keyword: "Piercing",
          raw: "＜Piercing＞",
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
      baseColors: ["Green"],
    },
  ],
};

registerIrCard("BT6-050", compiled);
