import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
