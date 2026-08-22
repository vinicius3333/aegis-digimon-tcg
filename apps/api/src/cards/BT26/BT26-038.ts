// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const clause = [{ kind: "Suspend", target: { count: 1, filter: { kind: ["Digimon"] } }, optional: true }, { kind: "ModifyDP", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" }] } }, amount: 3000, duration: "untilOpponentTurnEnd" }];
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: clause }, { trigger: "WhenDigivolving", actions: clause }, { trigger: "OnMove", actions: clause },
  { trigger: "AllTurns", isInherited: true, actions: [{ kind: "SubTrigger", event: "whenBattleWon", frequency: "OncePerTurn", actions: [{ kind: "Digivolve", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" }] } }, from: ["hand"], into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" }] }, payCost: true, costDelta: 1, optional: true }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-038", compiled);
