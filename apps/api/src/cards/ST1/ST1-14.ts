import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "ModifySecurityDP", controller: "mine", amount: 7000, duration: "untilOpponentTurnEnd" }] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "ModifySecurityDP", controller: "mine", amount: 7000, duration: "forTheTurn" }] },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST1-14", compiled);
