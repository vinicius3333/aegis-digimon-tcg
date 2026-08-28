// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenBlocked",
      isInherited: true,
      condition: { kind: "isYourTurn" },
      actions: [
        { kind: "ModifyDP", amount: 2000, duration: "forTheTurn", effectSourceBound: true, target: { isSelf: true } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-012", compiled);
export default compiled;
