import type { CompiledCard } from "@aegis/shared/effects/ir/card";
import { registerIrCard } from "#api/engine/effects/interpreter";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[When Attacking] ＜Draw 1＞ (Draw 1 card from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart: "Then, trash 1 card in your hand.",
          kind: "Trash",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Retaliation", raw: "＜Retaliation＞" }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BD05-06", compiled);
