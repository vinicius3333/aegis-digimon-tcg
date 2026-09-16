import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          breeding: true,
          requiresEmpty: "breedingArea",
          payCost: false,
          condition: {
            kind: "breedingAreaEmpty",
            raw: "your breeding area is empty",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Three Great Angels"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            to: "deckBottom",
            raw: "by returning 1 Digimon card with the [Three Great Angels] trait from your trash to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isFromHand: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT18-033", compiled);
