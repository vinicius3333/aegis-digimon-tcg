// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  keywords: [{ keyword: "Detach", raw: "＜Detach ([Seven Code] trait)＞" }],
  effects: [{
    trigger: "WhenAttacking",
    actions: [{
      kind: "Draw",
      controller: "mine",
      amount: 1,
      condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "lte", value: 7 },
    }],
  }, {
    trigger: "Static",
    isLinked: true,
    actions: [{
      kind: "SubTrigger",
      event: "whenLinked",
      sourceFilter: { isSelfRef: true },
      actions: [{
        kind: "Restrict",
        target: { filter: { controllerDefault: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
      }],
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-019", compiled);
