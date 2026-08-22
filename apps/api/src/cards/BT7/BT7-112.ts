// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 2, raw: "＜Security Attack +2＞" }],
    },
    {
      trigger: "WhenDigivolving",
      actions: [{
        kind: "Delete",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        raw: "Delete 1 of your opponent's Digimon.",
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-112", compiled);
