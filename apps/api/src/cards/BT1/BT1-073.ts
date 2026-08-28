// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { isSelf: true },
          amount: 1000,
          duration: "forTheTurn",
          scaling: { per: 1, unit: "cards", filter: { controller: "opponent", kind: ["Digimon"], suspended: true } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-073", compiled);
export default compiled;
