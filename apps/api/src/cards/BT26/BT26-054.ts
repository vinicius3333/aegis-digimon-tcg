// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const csTamer = { filter: { controller: "mine", zone: "hand", kind: ["Tamer"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }, count: 1 };
const csDigimon = { filter: { controller: "mine", zone: "hand", kind: ["Digimon"], nameOrTrait: [{ tokens: ["CS"], match: "trait" }] }, count: 1 };
export const compiled: CompiledCard = { effects: [
  { trigger: "OnPlay", actions: [{ kind: "PlayWithoutCost", target: csTamer, from: ["hand"], payCost: false, optional: true, condition: { kind: "raw", raw: "no Tamer you control has the same name" } }] },
  { trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", target: csTamer, from: ["hand"], payCost: false, optional: true, condition: { kind: "raw", raw: "no Tamer you control has the same name" } }] },
  { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onAddDigivolutionCards", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Digivolve", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, into: csDigimon.filter, from: ["hand"], payCost: false, optional: true }] }] },
  { trigger: "OpponentsTurn", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "RedirectAttack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, optional: true }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-054", compiled);
export default compiled;
