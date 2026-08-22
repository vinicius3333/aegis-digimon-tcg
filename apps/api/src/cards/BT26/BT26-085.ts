// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const self = { filter: { isSelfRef: true }, count: 1, isSelf: true };
const destroyMode = { controller: "mine", zone: "hand", nameOrTrait: [{ tokens: ["Chronomon: Destroy Mode"], match: "name" }] };

export const compiled: CompiledCard = {
  keywords: [
    { keyword: "Collision", raw: "＜Collision＞" },
    { keyword: "Reboot", raw: "＜Reboot＞" },
    { keyword: "Blocker", raw: "＜Blocker＞" },
  ],
  effects: [
    { trigger: "OnPlay", actions: [
      { kind: "Restrict", target: self, restriction: "dpImmune", duration: "untilOpponentTurnEnd", byOpponentEffectsOnly: true },
      { kind: "StackTrashLock", target: self, duration: "untilOpponentTurnEnd" },
    ] },
    { trigger: "AllTurns", actions: [{ kind: "Replacement", event: "wouldLeavePlay", mode: "prevent", sourceFilter: { isSelfRef: true }, actions: [{ kind: "Digivolve", target: self, into: destroyMode, from: ["hand", "trash"], payCost: false, optional: true, abortOnDecline: true }] }] },
  ],
  coverage: "full",
  residual: [],
  assemblyRequirement: [{ reduceCost: 5, materials: [{ count: 5, nameOrTrait: [{ tokens: ["Chronomon"], match: "text" }, { tokens: ["Shaman"], match: "trait" }], differentLevels: true }] }],
};

registerIrCard("BT26-085", compiled);
export default compiled;
