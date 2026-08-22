// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "ModifyDP", target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: 1 }, amount: 3000, duration: "forTheTurn" }] },
    { trigger: "Security", actions: [
      { kind: "ModifyDP", target: { filter: { controllerDefault: "mine", kind: ["Digimon"] }, count: "all" }, amount: 5000, duration: "forTheTurn" },
      { kind: "ModifySecurityDP", controller: "mine", amount: 5000, duration: "forTheTurn" },
      { kind: "AddToHandSelf" },
    ], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-13", compiled);
export { compiled };
