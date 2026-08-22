// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "OpponentsTurn", actions: [{ kind: "ModifySecurityDP", controller: "mine", amount: 2000, continuous: true }] },
    { trigger: "Security", actions: [{ kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-12", compiled);
export { compiled };
