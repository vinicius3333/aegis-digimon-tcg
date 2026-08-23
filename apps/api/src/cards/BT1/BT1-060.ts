// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: [{ kind: "Recover", controller: "mine", amount: 1 }] },
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { isSelf: true },
          amount: 1000,
          duration: "forTheTurn",
          scaling: { per: 3, unit: "security", filter: { controller: "mine" } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-060", compiled);
export default compiled;
