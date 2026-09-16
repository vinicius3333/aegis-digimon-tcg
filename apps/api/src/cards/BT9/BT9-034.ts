import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "lookAndMayAddToHand",
          controller: "mine",
          source: "securityTop",
          amount: 1,
          ifAddedToHand: [
            {
              kind: "SecurityManipulation",
              op: "addTop",
              controller: "mine",
              source: "deck",
              amount: 1,
            },
          ],
          raw: "Look at the top card of your security stack, and you may add it to your hand. If you do, <Recovery +1 (Deck)>. If not, place it back on top of security face down.",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Salamon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-034", compiled);
