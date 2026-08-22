// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const immuneAndDp = [
  { kind: "Restrict", target: self, restriction: "beAffected", duration: "untilOpponentTurnEnd", fromSourceKind: ["Digimon"], byOpponentEffectsOnly: true },
  { kind: "ModifyDP", target: self, amount: 3000, duration: "untilOpponentTurnEnd" },
];
const unsuspend = { kind: "Unsuspend", target: self, optional: true };
export const compiled: CompiledCard = { effects: [
  { trigger: "WhenDigivolving", actions: [{ kind: "TrashDigivolution", target: { filter: { controller: "mine", zone: "digivolutionCards", faceDown: true, underKind: ["Tamer"] }, count: 1 }, amount: 1, optional: true }, ...immuneAndDp] },
  { trigger: "AllTurns", frequency: "OncePerTurn", actions: [
    { kind: "SubTrigger", event: "whenAttackTargetSwitched", actions: [unsuspend] },
    { kind: "SubTrigger", event: "whenDigivolutionTrashed", sourceFilter: { controller: "mine", kind: ["Tamer"], byEffect: true }, actions: [unsuspend] },
  ] },
  { trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHave", filter: { controller: "mine", nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }] } } }] },
  { trigger: "Main", actions: [
    { kind: "DeDigivolve", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, amount: 1 },
    { kind: "GainTriggeredEffect", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 }, gainedTrigger: "StartOfYourMainPhase", gainedActions: [{ kind: "Attack", target: self }], duration: "untilOpponentTurnEnd" },
  ] },
], coverage: "full", residual: [] };
registerIrCard("BT26-057", compiled);
export default compiled;
