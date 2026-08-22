// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenDigivolving",
    actions: [{
      kind: "GainKeyword",
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
      keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
      duration: "untilOpponentTurnEnd",
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST5-09", compiled);
