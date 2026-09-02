// HAND-FIXED IR for BT4-027 (KendoGarurumon) — do not regenerate over this file.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
            count: 1,
          },
          to: "hand",
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
      baseColors: ["Blue"],
    },
  ],
};

registerIrCard("BT4-027", compiled);
