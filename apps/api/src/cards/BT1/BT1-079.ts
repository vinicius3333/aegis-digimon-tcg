// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], excludeKeywords: [{ keyword: "Blocker" }] },
            count: 1,
            forceSelection: true,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-079", compiled);
export default compiled;
