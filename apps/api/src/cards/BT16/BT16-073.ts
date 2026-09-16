import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 2,
          },
        },
      ],
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              kind: ["Tamer"],
              controller: "mine",
              textContains: "[Myotismon]",
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          abortOnDecline: true,
          notSameNameAs: ["battleArea"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-073", compiled);
export { compiled };
