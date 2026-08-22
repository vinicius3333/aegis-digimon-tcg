// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const opponentTargets = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 2, upTo: true };
const dataSquad = { filter: { controller: "mine", zone: "hand", kind: ["Digimon", "Tamer", "Option"], nameOrTrait: [{ tokens: ["DATA SQUAD"], match: "trait" }], playCostLte: 3 }, count: 1 };
const playOrUseDataSquad = { kind: "PlayWithoutCost", target: dataSquad, from: ["hand"], payCost: false, optional: true, playCostCeiling: { base: 3, raise: 1, per: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"], suspended: true }, unit: "cards" } };
const reactPlay = { kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, actions: [playOrUseDataSquad] };
const reactTrash = { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }, actions: [playOrUseDataSquad] };
export const compiled: CompiledCard = { effects: [
  { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-049-suspend", actions: [{ kind: "Suspend", target: opponentTargets }] },
  { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bt26-049-suspend", actions: [{ kind: "Suspend", target: opponentTargets }] },
  { trigger: "AllTurns", frequency: "OncePerTurn", actions: [reactPlay, reactTrash] },
], coverage: "full", residual: [] };
registerIrCard("BT26-049", compiled);
export default compiled;
