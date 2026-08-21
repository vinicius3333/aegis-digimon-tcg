// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [{
        kind: "Replacement", event: "wouldDigivolve", sourceFilter: { isSelfRef: true },
        into: {
          controllerDefault: "mine", kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Avian", "Bird", "Beast", "Animal", "Sovereign"], match: "trait" }],
          excludeNameOrTrait: [{ tokens: ["Sea Animal"], match: "trait" }],
        },
        actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
      }],
    },
    {
      trigger: "YourTurn",
      actions: [{ kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 2000, duration: "permanent" }],
      isInherited: true,
    },
  ],
  coverage: "full", residual: [],
  digivolutionRequirement: [{ names: ["Poromon"], cost: 0, isAlternate: true }, { level: 2, traits: ["TS"], cost: 0, isAlternate: true }],
};

registerIrCard("BT25-010", compiled);
