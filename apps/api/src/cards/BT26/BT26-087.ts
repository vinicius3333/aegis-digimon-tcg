// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const tsTrashCost = { kind: "trash", target: { count: 1, filter: { zone: "hand", controller: "mine", nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } } };
export const compiled: CompiledCard = { effects: [
  { trigger: "StartOfYourMainPhase", actions: [
    { kind: "GainMemory", amount: 1, cost: { kind: "return", target: { count: 1, filter: { zone: "trash", controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["TS"], match: "trait" }] } }, to: "deckBottom" }, optional: true },
    { kind: "Return", to: "hand", target: { count: 1, filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Giant Slayer"], match: "name" }] } }, optional: true },
  ] },
  { trigger: "OnPlay", actions: [{ kind: "Draw", controller: "mine", amount: 2, cost: tsTrashCost, optional: true }] },
  { trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", target: { count: 1, filter: { isSelfRef: true } }, payCost: false }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-087", compiled);
