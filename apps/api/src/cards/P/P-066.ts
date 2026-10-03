import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          effectTextPart:
            "[Security] At the end of the battle, delete 1 of your opponent's Digimon with 4000 DP or less. If no Digimon was deleted by this effect, ＜Draw 1＞. (Draw 1 card from your deck.)",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 4000 },
            },
            count: 1,
          },
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "no Digimon was deleted by this effect",
          },
        },
        {
          kind: "AddToHandSelf",
          effectTextPart: "Then, add this card to its owner’s hand.",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-066", compiled);
