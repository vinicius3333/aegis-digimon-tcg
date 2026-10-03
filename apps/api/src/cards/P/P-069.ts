import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "Suspend",
          effectTextPart: "[Security] At the end of the battle, suspend 1 of your opponent's Digimon.",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
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

registerIrCard("P-069", compiled);
