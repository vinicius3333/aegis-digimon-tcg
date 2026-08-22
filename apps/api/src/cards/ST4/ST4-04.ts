// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "ModifyDP",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      amount: 2000,
      duration: "forTheTurn",
      condition: { kind: "attackTargetMatchesFilter", filter: { controller: "opponent", kind: ["Digimon"] } },
    }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST4-04", compiled);
