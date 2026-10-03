import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "GainKeyword",
          effectTextPart:
            "[Security] At the end of the battle, 1 of your opponent's Digimon gains ＜Security Attack -1＞ for the turn. (This Digimon checks 1 fewer security cards.)",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "forTheTurn",
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

registerIrCard("P-068", compiled);
