// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: [{ kind: "RevealAdd", revealCount: 3, add: [
    { filter: { nameOrTrait: [{ tokens: ["Keenan Crier"], match: "name" }, { tokens: ["DATA SQUAD"], match: "trait" }] }, count: 1, to: "hand" },
    { filter: { colors: ["Purple"], nameOrTrait: [{ tokens: ["Ravemon"], match: "name" }, { tokens: ["Avian"], match: "trait" }, { tokens: ["Bird"], match: "trait" }] }, count: 1, to: "hand" },
  ], rest: "deckBottom" }] },
  { trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } }, optional: false }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-065", compiled);
