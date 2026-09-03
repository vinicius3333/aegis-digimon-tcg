import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [{ kind: "Draw", controller: "mine", amount: 1, condition: { kind: "selfDpAtLeast", value: 6000 } }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-001", compiled);
