// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "WhenBlocked",
      isInherited: true,
      condition: { kind: "isYourTurn" },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-022", compiled);
export default compiled;
