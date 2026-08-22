// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [{
    trigger: "OpponentsTurn",
    actions: [{
      kind: "ModifyDP",
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      amount: 1000,
      duration: "untilOpponentTurnEnd",
      condition: {
        kind: "allYoursMatchFilter",
        filter: { kind: ["Digimon"], suspended: true },
        raw: "all of your Digimon are suspended",
      },
    }],
    isInherited: true,
  }],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-004", compiled);
