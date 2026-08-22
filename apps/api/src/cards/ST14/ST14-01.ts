// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "TrashTopDeck",
      controller: "mine",
      amount: 2,
      condition: { kind: "selfHasTrait", filter: { nameOrTrait: [{ tokens: ["Wizard", "Demon Lord"], match: "trait" }] } },
    }],
    isInherited: true,
    frequency: "OncePerTurn",
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST14-01", compiled);
