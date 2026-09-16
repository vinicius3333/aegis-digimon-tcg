import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] ＜De-Digivolve 1＞ 1 of your opponent's Digimon.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
        },
        {
          kind: "DeleteBudget",
          filter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          budget: 6,
          upTo: true,
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["D-Brigade", "DigiPolice"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
            },
            raw: "by returning 3 cards with the [D-Brigade] or [DigiPolice] trait from your trash to the top of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT14-098", compiled);
export { compiled };
