import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart: "[Main] Suspend 2 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 2,
          },
        },
        {
          effectTextPart:
            "Then, return all of your opponent's suspended Digimon with the lowest DP to the bottom of the deck. All of your Digimon get +3000 DP until the end of your opponent's turn.",
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              suspended: true,
              kind: ["Digimon"],
              superlative: "lowestDP",
            },
            count: "all",
          },
          to: "deckBottom",
        },
        {
          effectTextPart:
            "Then, return all of your opponent's suspended Digimon with the lowest DP to the bottom of the deck. All of your Digimon get +3000 DP until the end of your opponent's turn.",
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: "all",
          },
          amount: 3000,
          duration: "untilOpponentTurnEnd",
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

registerIrCard("BT16-095", compiled);
export { compiled };
