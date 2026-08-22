// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const action = [
  { kind: "SecurityManipulation", op: "toHand", controller: "mine", amount: 1 },
  { kind: "SecurityManipulation", op: "addTop", controller: "mine", source: "deck", amount: 1 },
  { kind: "Suspend", target: { count: 1, filter: { controller: "any", kind: ["Digimon"] } }, optional: true },
];
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: action }, { trigger: "WhenDigivolving", actions: action },
  { trigger: "YourTurn", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "GainMemory", amount: 1 }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-041", compiled);
