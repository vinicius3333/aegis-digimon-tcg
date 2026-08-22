// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{ kind: "ModifyDP", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -4000, duration: "forTheTurn" }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-11", compiled);
export { compiled };
