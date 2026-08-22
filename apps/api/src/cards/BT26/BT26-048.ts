// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const ver4 = { controller: "mine", zone: "hand", kind: ["Digimon"], dp: { op: "lte", value: 6000 }, nameOrTrait: [{ tokens: ["Ver.4"], match: "trait" }] };
const trashBottomFaceDown = { kind: "TrashDigivolution", target: { filter: { controller: "mine", kind: ["Digimon"], digivolutionCards: "hasFaceDown" }, count: 1 }, amount: 1, optional: true, condition: { kind: "raw", raw: "bottom face-down digivolution card" } };
const play = { kind: "PlayWithoutCost", target: { filter: ver4, count: 1 }, from: ["hand"], payCost: false, optional: true, condition: { kind: "ifThisEffectActed" } };
export const compiled: CompiledCard = { effects: [
  { trigger: "Static", keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }, { keyword: "Vortex", raw: "＜Vortex＞" }], actions: [] },
  { trigger: "WhenDigivolving", actions: [trashBottomFaceDown, play] },
  { trigger: "WhenAttacking", actions: [trashBottomFaceDown, play] },
  { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "onDigivolutionCardsDiscardedBatch", sourceFilter: { controller: "mine", kind: ["Digimon"] }, actions: [{ kind: "ModifyDP", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: -6000, duration: "untilEachTurnEnd" }] }] },
], coverage: "full", residual: [] };
registerIrCard("BT26-048", compiled);
export default compiled;
