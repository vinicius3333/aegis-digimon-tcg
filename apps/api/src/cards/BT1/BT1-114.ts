// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 2, raw: "＜Security Attack +2＞" }],
    },
    { trigger: "WhenAttacking", actions: [{ kind: "GainMemory", amount: -5 }] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", target: { isSelf: true }, amount: 3000, duration: "forTheTurn" }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-114", compiled);
export default compiled;
