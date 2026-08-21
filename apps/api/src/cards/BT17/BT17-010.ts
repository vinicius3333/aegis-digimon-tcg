// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", kind: ["Digimon"], dp: { op: "lte", value: 4000 } }, count: 1 } }, { kind: "ModifyDP", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, amount: 3000, duration: "forTheTurn", condition: { kind: "ifThisEffectDidNotDelete" } }] },
    { trigger: "AllTurns", actions: [{ kind: "CostModifier", mode: "raiseCeiling", costType: "dpDeletion", amount: 2000, condition: { kind: "memoryAtMost", value: 0 } }], isInherited: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-010", compiled);
