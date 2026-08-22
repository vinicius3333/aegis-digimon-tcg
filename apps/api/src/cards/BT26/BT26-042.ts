// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const targets = { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 };
const traitTarget = { filter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [
  { tokens: ["Insectoid"], match: "trait" }, { tokens: ["Titan"], match: "trait" },
] }, count: 1 };
const suspendAndLock = [
  { kind: "Suspend", target: targets },
  { kind: "Restrict", target: targets, restriction: "unsuspend", duration: "untilOpponentTurnEnd" },
];
const piercingAndDp = [
  { kind: "GainKeyword", keyword: { keyword: "Piercing" }, target: traitTarget, duration: "untilOpponentTurnEnd" },
  { kind: "ModifyDP", amount: 3000, target: traitTarget, duration: "untilOpponentTurnEnd" },
];
export const compiled: CompiledCard = {
  effects: [
    { trigger: "OnPlay", actions: suspendAndLock },
    { trigger: "WhenDigivolving", actions: suspendAndLock },
    { trigger: "OnPlay", frequency: "OncePerTurn", sharedUseKey: "bt26-042-piercing-dp", actions: piercingAndDp },
    { trigger: "OnAllyAttack", frequency: "OncePerTurn", sharedUseKey: "bt26-042-piercing-dp", actions: piercingAndDp },
    { trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{
      kind: "SubTrigger", event: "whenDeletesInBattle",
      actions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1 }],
    }] },
  ],
  coverage: "full", residual: [],
};
registerIrCard("BT26-042", compiled);
export default compiled;
