import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Main", actions: [{ kind: "ModifyDP", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 }, amount: 3000, duration: "forTheTurn" }] },
    { trigger: "Security", actions: [{ kind: "GainKeyword", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" }, keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }, duration: "untilYourTurnEnd" }], isSecurity: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST1-13", compiled);
