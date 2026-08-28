// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "TrashDigivolution",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: "all",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-099", compiled);
export default compiled;
