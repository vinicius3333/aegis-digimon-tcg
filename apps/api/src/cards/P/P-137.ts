// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// <Armor Purge>, <Raid> keywords.
// [Your Turn] [Once Per Turn]: When THIS Digimon's attack target is switched,
// opponent adds the top card of their security stack to hand.
// Encoded as YourTurn SubTrigger(whenAttackTargetSwitched) → SecurityManipulation(toHand).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Raid",
          raw: "＜Raid＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "SecurityManipulation",
              op: "toHand",
              controller: "opponent",
              amount: 1,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Veemon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-137", compiled);
