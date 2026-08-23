// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "AddToHandSelf" }] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-096", compiled);
export default compiled;
