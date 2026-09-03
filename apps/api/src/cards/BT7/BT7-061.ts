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
          target: { filter: { controller: "mine", kind: ["Tamer"], colors: ["Black"] }, count: 1 },
          payCost: true,
          asLevel: 3,
          from: ["hand"],
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "keyword", keyword: { keyword: "Blocker", raw: "＜Blocker＞" } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      cost: 3,
      isAlternate: true,
      baseIsTamer: true,
      baseColors: ["Black"],
    },
  ],
};

registerIrCard("BT7-061", compiled);
