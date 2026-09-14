import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT5-105 (Ultimate Flare).
// Fix: Delete action was targeting ALL opponent Digimon without a playCost filter;
// text says "delete all of your opponent's Digimon with play costs of 3 or less".
// KB Q1379: even if no valid De-Digivolve target exists, can still delete
// playCost-3-or-less Digimon.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] Trigger ＜De-Digivolve 3＞ on 1 of your opponent's Digimon. (Trash up to 3 cards from the top of one of your opponent's Digimon. If it has no digivolution cards, or becomes a level 3 Digimon, you can't trash any more cards.)",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 3,
        },
        {
          effectTextPart: "Then, delete all of your opponent's Digimon with play costs of 3 or less.",
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 3,
            },
            count: "all",
          },
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

registerIrCard("BT5-105", compiled);
