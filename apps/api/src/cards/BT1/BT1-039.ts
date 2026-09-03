import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: false,
      frequency: "TwicePerTurn",
      optional: true,
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: { kind: "trash", target: { filter: { controller: "mine", zone: "hand" }, count: 3 } },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-039", compiled);
export default compiled;
