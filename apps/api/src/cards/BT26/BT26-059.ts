// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const titan = { filter: { controller: "mine", zone: "trash", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Titan"], match: "trait" }], excludeCardId: "BT26-059" }, count: 1 };
const shared = [
  { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 1 }, optional: true },
  { kind: "PlayWithoutCost", target: titan, from: ["trash"], payCost: true, reduceCostBy: 7, optional: true, condition: { kind: "raw", raw: "if it is your turn" } },
];
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", actions: [{ kind: "Replacement", event: "wouldBePlayed", sourceFilter: { controllerDefault: "mine", isSelfRef: true }, mode: "reduceCost", amount: 6, condition: { kind: "raw", raw: "your hand has fewer cards than your opponent's hand" } }] },
  { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: "bt26-059-trash-play-titan", actions: shared },
  { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-059-trash-play-titan", actions: shared },
  { trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "bt26-059-trash-play-titan", actions: shared },
  { trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenHandTrashed", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], lowestLevel: true }, count: "all" }, optional: true }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-059", compiled);
export default compiled;
