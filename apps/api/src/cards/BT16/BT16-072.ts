// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// <Blocker>
// [On Play] Reveal top 5. Trash 2 purple among them. Return rest to deck bottom.
// [On Deletion] You may play 1 Tamer with [Myotismon] in its text from trash
//   without paying cost, without the same name as any of your battle-area Tamers.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [
            {
              filter: {
                colors: ["Purple"],
              },
              count: 2,
              to: "trash",
            },
          ],
          rest: "deckBottom",
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
              controller: "mine",
              kind: ["Tamer"],
              textContains: "[Myotismon]",
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
          notSameNameAs: ["battleArea"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT16-072", compiled);
export { compiled };
