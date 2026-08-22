// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "CostModifier",
      mode: "reduce",
      costType: "digivolve",
      amount: 1,
      target: { filter: { zone: "battleArea", controller: "mine", kind: ["Digimon"] } },
      into: { zone: "hand", controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Insectoid", "Ancient Insect"], match: "trait" }] },
      once: true,
      duration: "untilEachTurnEnd",
    }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("EX1-033", compiled);
