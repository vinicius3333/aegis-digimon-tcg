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
      condition: { kind: "raw", raw: "this Digimon has [Wizard] or [Demon Lord] in its traits" },
    }],
    isInherited: true,
    frequency: "OncePerTurn",
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("ST14-01", compiled);
