// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "GainKeyword",
          target: { isSelf: true },
          keyword: { keyword: "SecurityAttack", amount: 1 },
          duration: "forTheTurn",
          condition: { kind: "selfLevelAtLeast", value: 6 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-068", compiled);
export default compiled;
