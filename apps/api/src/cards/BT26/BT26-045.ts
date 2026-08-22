// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const insectoidTitan = { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [
  { tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" },
] }, count: 1 };
const freePlay = { kind: "PlayWithoutCost", target: { filter: { controller: "mine", zone: "hand", kind: ["Digimon"], levelComparison: { op: "lte", value: 4 }, nameOrTrait: [
  { tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" },
] }, count: 1 }, from: ["hand"], payCost: false, optional: true };
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine", isSelfRef: true }, mode: "reduceCost", amount: 4, condition: { kind: "raw", raw: "your hand has fewer cards than your opponent's hand" } }] },
  { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: "bt26-045-free-play", actions: [freePlay] },
  { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-045-free-play", actions: [freePlay] },
  { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bt26-045-free-play", actions: [freePlay] },
  { trigger: "YourTurn", actions: [
    { kind: "GainKeyword", keyword: { keyword: "Alliance" }, target: insectoidTitan, duration: "untilEachTurnEnd" },
    { kind: "GainKeyword", keyword: { keyword: "Piercing" }, target: insectoidTitan, duration: "untilEachTurnEnd" },
    { kind: "GainKeyword", keyword: { keyword: "Vortex" }, target: insectoidTitan, duration: "untilEachTurnEnd" },
  ] },
], coverage: "full", residual: [] };
registerIrCard("BT26-045", compiled);
export default compiled;
