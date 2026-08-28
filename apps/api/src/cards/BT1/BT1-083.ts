// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 4000, duration: "forTheTurn" }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-083", compiled);
export default compiled;
