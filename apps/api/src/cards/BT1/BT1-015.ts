// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "forTheTurn", target: { isSelf: true } }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-015", compiled);
export default compiled;
