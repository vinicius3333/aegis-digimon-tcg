// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// effectText: Digivolve 3 from Lv.4 2-color w/green
// Digivolution parenthetical: <Alliance> (by suspending 1 of your other Digimon, this
//   Digimon adds the suspended Digimon's DP and gains <Security Attack +1> for the attack).
// [End of Attack] (non-inherited): If you have 3 or fewer security cards, place the top
//   card of your deck on top of your security stack.
// inheritedEffectText: [End of Attack][Once Per Turn] If you have another suspended Digimon
//   in play, 1 of your opponent's Digimon gets -2000 DP for the turn.
//
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeFromDeck",
          controller: "mine",
          amount: 1,
          toTop: true,
          condition: {
            kind: "youHave",
            filter: {
              zone: "security",
              controllerDefault: "mine",
            },
            count: 3,
            comparison: "lte",
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -2000,
          duration: "forTheTurn",
          condition: {
            kind: "youHave",
            filter: {
              zone: "battleArea",
              controllerDefault: "mine",
              excludeSelf: true,
              suspended: true,
              kind: ["Digimon"],
            },
            raw: "you have another suspended Digimon in play",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      multicolor: true,
      colorCount: 2,
      colors: ["Green"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-029", compiled);
