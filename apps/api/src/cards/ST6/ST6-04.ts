// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
              colors: ["Purple"],
              playCostOneOf: [1, 7],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST6-04", compiled);
