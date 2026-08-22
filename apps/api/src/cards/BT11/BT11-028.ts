// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const handScaling = { per: 4, filter: { zone: "hand", controller: "opponent" }, unit: "cards" };
export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [
      { kind: "GainKeyword", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, keyword: { keyword: "Blocker", raw: "＜Blocker＞" }, duration: "untilOpponentTurnEnd", scaling: handScaling },
      { kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 2000, duration: "untilOpponentTurnEnd", scaling: handScaling },
    ] },
    { trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenEffectAddsToOpponentHand", actions: [{ kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }] }], isInherited: true, frequency: "OncePerTurn" },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-028", compiled);
