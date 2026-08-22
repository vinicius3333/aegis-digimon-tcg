// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const tsOption = { controller: "mine", zone: "hand", kind: ["Option"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] };

export const compiled: CompiledCard = {
  effects: [
    { trigger: "StartOfYourMainPhase", actions: [{ kind: "GainMemory", amount: 1, condition: { kind: "memoryAtMost", controller: "mine", value: 4, raw: "you have 4 or less memory" } }] },
    { trigger: "EndOfYourTurn", actions: [{ kind: "UseOptionWithoutCost", target: { filter: tsOption, count: 1 }, from: ["hand"], payCost: true, reduceCostBy: 0, optional: true, cost: { kind: "suspend", target: self }, raw: "For each point of memory your opponent has, reduce this effect's paid cost by 1." }] },
    { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: self, from: ["security"], payCost: false }] },
  ],
  coverage: "partial",
  residual: ["The End of Your Turn Option use lacks an executable dynamic reduction equal to the opponent's memory; IR currently has no memory-based scaling for UseOptionWithoutCost."],
};

registerIrCard("BT26-090", compiled);
export default compiled;
