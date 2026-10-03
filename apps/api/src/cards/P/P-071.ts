import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          effectTextPart:
            "[Security] At the end of the battle, you may play 1 purple level 3 Digimon card from your trash without paying its memory cost.",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levels: [3],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "AddToHandSelf",
          effectTextPart: "Then, add this card to its owner's hand.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-071", compiled);
