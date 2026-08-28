// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          keyword: { keyword: "Blocker" },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    { trigger: "Security", actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "AddToHandSelf" }] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-103", compiled);
export default compiled;
