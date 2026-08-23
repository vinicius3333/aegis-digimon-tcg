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
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "permanentCount",
            seat: "opponent",
            op: "gte",
            value: 2,
            filter: { kind: ["Digimon"], suspended: true },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-076", compiled);
export default compiled;
