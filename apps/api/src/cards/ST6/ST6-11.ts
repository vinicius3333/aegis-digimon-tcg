// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "Aura",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          effect: { kind: "modifyDP", amount: 2000 },
          while: {
            kind: "zoneCount",
            seat: "mine",
            zone: "trash",
            op: "gte",
            value: 5,
            raw: "you have 5 or more cards in your trash",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST6-11", compiled);
