// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const place = { kind: "PlaceUnder", target: { filter: { controller: "mine", zone: "hand" }, count: 1 }, underFilter: { isSelfRef: true }, position: "bottom", faceDown: true, optional: true };
const deleteBody = [
  { kind: "Delete", target: { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Ver.3"], match: "trait" }] }, count: 1 }, optional: true },
  { kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], lowestPlayCost: true }, count: "all" }, optional: true },
];
const body = [place, ...deleteBody];
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", keywords: [{ keyword: "Fragment", amount: 2, raw: "＜Fragment (2)＞" }], actions: [] },
  { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: "bt26-055-place-delete", actions: body },
  { trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "bt26-055-place-delete", actions: body },
  { trigger: "Counter", frequency: "OncePerTurn", sharedUseKey: "bt26-055-place-delete", actions: body },
  { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenLeavesPlay", sourceFilter: { isSelfRef: true }, actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-055", compiled);
export default compiled;
