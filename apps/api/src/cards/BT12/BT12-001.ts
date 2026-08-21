// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "YourTurn",
    actions: [{ kind: "CostModifier", mode: "raiseCeiling", costType: "dpDeletion", amount: 1000 }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT12-001", compiled);
