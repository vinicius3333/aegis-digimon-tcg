// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "OpponentsTurn",
    isInherited: true,
    actions: [{
      kind: "Aura",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      effect: { kind: "modifyDP", amount: 1000 },
      while: { kind: "allYoursMatchFilter", filter: { zone: "battleArea", kind: ["Digimon"], suspended: true } },
    }],
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-004", compiled);
