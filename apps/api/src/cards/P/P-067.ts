import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "Draw",
          effectTextPart: "[Security] At the end of the battle, ＜Draw 2＞. (Draw 2 cards from your deck.)",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "AddToHandSelf",
          effectTextPart: "Then, add this card to its owner’s hand.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-067", compiled);
