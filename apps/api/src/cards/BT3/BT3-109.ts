import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GrantStatic",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          grant: "effects",
          tokens: ["OnDeletionPlaySelfNoOnPlay"],
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT3-109", compiled);
export default compiled;
