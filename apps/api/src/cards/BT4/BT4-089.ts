import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] Trigger ＜Draw 2＞. (Draw 2 cards from your deck.)",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              colors: ["Purple"],
              kind: ["Option"],
              playCostLte: 6,
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-089", compiled);
