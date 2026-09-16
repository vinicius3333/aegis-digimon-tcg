import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              excludeNameOrTrait: [{ tokens: ["Fake Agumon Expert"], match: "nameExact" }],
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              effectTextContains: "[On Deletion]",
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

registerIrCard("BT5-072", compiled);
