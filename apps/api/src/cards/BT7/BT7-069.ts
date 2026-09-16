import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart: "[On Deletion] ＜Draw 3＞. (Draw 3 cards from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 3,
        },
        {
          effectTextPart: "Then, trash 2 cards in your hand.",
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
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-069", compiled);
