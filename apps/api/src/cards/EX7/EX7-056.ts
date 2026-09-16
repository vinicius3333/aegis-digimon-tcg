import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
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
      trigger: "OnDeletion",
      actions: [
        {
          effectTextPart: "[On Deletion] Trash 1 card in your hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's level 3 Digimon and level 4 Digimon.",
          kind: "Delete",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [3],
            },
          },
        },
        {
          effectTextPart: "Then, delete 1 of your opponent's level 3 Digimon and level 4 Digimon.",
          kind: "Delete",
          target: {
            count: 1,
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levels: [4],
            },
          },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Retaliation",
          raw: "＜Retaliation＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX7-056", compiled);
