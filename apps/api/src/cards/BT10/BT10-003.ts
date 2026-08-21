// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: {
        kind: "selfHasTrait",
        filter: { nameOrTrait: [{ tokens: ["Xros Heart"], match: "trait" }] },
        raw: "this Digimon has [Xros Heart] in its traits",
      },
    }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-003", compiled);
