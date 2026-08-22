// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenDigivolving",
    actions: [{
      kind: "Restrict",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      restriction: "attackOrBlock",
      duration: "untilOpponentTurnEnd",
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST4-12", compiled);
