import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
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
      trigger: "Static",
      actions: [],
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
          effectTextPart:
            "[On Deletion] If your opponent has 5 or more cards in their hand, they trash 1 card in their hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
          },
          controller: "opponent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 5,
            raw: "your opponent has 5 or more cards in their hand",
          },
        },
        {
          effectTextPart:
            "Then, if they have 4 or fewer cards in their hand, delete 1 of their level 6 or lower Digimon.",
          kind: "Delete",
          target: {
            filter: {
              controllerDefault: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 6,
              },
            },
            count: 1,
          },
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "lte",
            value: 4,
            raw: "they have 4 or fewer cards in their hand",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-044", compiled);
