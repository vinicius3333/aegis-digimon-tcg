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
          amount: 2000,
          duration: "forTheTurn",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "gte", value: 6 },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-005", compiled);
export default compiled;
