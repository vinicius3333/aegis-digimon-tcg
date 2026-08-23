// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        {
          kind: "Restrict",
          target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"] } },
          restriction: "attackOrBlock",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    { trigger: "Static", isInherited: true, actions: [], keywords: [{ keyword: "Evade", raw: "＜Evade＞" }] },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT26-020", compiled);
