// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          amount: 1000,
          duration: "forTheTurn",
          target: { isSelf: true },
          condition: { kind: "youDigivolvedThisTurn" },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-007", compiled);
export default compiled;
