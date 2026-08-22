// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTargets = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2, upTo: true };
const dataSquad = { filter: { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }], playCostLte: 3 }, count: 1 };
const reactPlay = { kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, actions: [{ kind: "PlayWithoutCost", target: dataSquad, from: ["hand"], payCost: false, optional: true }] };
const reactTrash = { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }, actions: [{ kind: "PlayWithoutCost", target: dataSquad, from: ["hand"], payCost: false, optional: true }] };
export const compiled: CompiledCard = { effects: [
  { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-049-suspend", actions: [{ kind: "Suspend", target: opponentTargets }] },
  { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bt26-049-suspend", actions: [{ kind: "Suspend", target: opponentTargets }] },
  { trigger: "AllTurns", frequency: "OncePerTurn", actions: [reactPlay, reactTrash] },
], coverage: "full", residual: [] };
registerIrCard("BT26-049", compiled);
export default compiled;
