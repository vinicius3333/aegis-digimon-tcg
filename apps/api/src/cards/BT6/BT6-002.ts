// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "YourTurn",
    isInherited: true,
    frequency: "OncePerTurn",
    actions: [{
      kind: "SubTrigger",
      event: "whenDigivolutionTrashed",
      sourceFilter: { controller: "opponent", kind: ["Digimon"] },
      actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
      raw: "When one of your opponent's digivolution cards is trashed, Draw 1.",
    }],
    raw: "[Your Turn][Once Per Turn] When one of your opponent's digivolution cards is trashed, Draw 1.",
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-002", compiled);
