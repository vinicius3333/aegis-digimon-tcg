// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [{ kind: "Unsuspend", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 } }],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT1-036", compiled);
export default compiled;
