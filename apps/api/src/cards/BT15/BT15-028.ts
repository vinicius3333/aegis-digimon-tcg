import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] Trash the bottom 3 digivolution cards of 1 of your opponent's Digimon.",
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              digivolutionCards: "hasAny",
            },
            count: 1,
          },
          amount: 3,
          fromTop: false,
        },
        {
          effectTextPart:
            "Then, if your opponent has no Digimon with digivolution cards, you may play 1 blue Tamer card from your hand without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              colors: ["Blue"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "opponentHasNone",
            filter: {
              digivolutionCards: "hasAny",
              controllerDefault: "opponent",
              kind: ["Digimon"],
            },
            raw: "your opponent has no Digimon with digivolution cards",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-028", compiled);
export { compiled };
