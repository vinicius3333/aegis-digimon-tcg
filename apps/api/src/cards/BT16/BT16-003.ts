import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
      condition: {
        kind: "selfColorCount",
        value: 2,
        raw: "this Digimon has 2 or more colors",
      },
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-003", compiled);
export { compiled };
