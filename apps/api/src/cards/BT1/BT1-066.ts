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
          target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 3000 } }, count: 1 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-066", compiled);
export default compiled;
