// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4136: using an Option through this effect is a genuine Option use and therefore
// triggers watchers such as BT3-096 Mimi Tachikawa.
const compiled: CompiledCard = {
  effects: [
    {
      effectKey: "P-027/digi-burst-use-option",
      trigger: "Main",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            colors: ["Purple"],
            playCostLte: 7,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          // Digi-Burst is payable even when the optional Option payload has no
          // eligible card; paying it still trashes the printed source cards.
          allowCostWithoutTarget: true,
          cost: {
            kind: "trash",
            target: {
              filter: { isSelfRef: true, zone: "digivolutionCards" },
              count: 2,
            },
            raw: "＜Digi-Burst 2＞",
          },
        },
      ],
      keywords: [
        {
          keyword: "DigiBurst",
          amount: 2,
          raw: "＜Digi-Burst 2＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-027", compiled);
