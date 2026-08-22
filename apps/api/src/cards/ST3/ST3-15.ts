// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "GainKeyword", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: 1 }, keyword: { keyword: "SecurityAttack", amount: -3 }, duration: "untilOpponentTurnEnd" }] },
    { trigger: "Security", actions: [{ kind: "GainKeyword", target: { filter: { controllerDefault: "opponent", kind: ["Digimon"] }, count: "all" }, keyword: { keyword: "SecurityAttack", amount: -1 }, duration: "forTheTurn" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST3-15", compiled);
export { compiled };
