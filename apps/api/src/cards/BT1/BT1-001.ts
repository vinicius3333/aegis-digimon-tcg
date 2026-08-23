// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      isInherited: true,
      condition: { kind: "attackTargetMatchesFilter", filter: { controller: "opponent", kind: ["Digimon"] } },
      actions: [{ kind: "ModifyDP", amount: 1000, duration: "forTheTurn", target: { isSelf: true } }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-001", compiled);
export default compiled;
