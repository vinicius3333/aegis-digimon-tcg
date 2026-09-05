// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX4-057 (Antylamon).
// Text:
//   [Main] Digivolve from 2-color w/green Lv.4 (cost 3). (When this Digimon attacks, by
//          suspending 1 of your other Digimon, this Digimon adds the suspended Digimon's
//          DP and gains <Security Attack +1> for the attack.)
//   The parenthetical attack reminder is the printed <Alliance> keyword, not a separate
//   inherited WhenAttacking effect.
//   [End of Attack] You may play 1 green Lv.3 Digimon card from your trash without paying
//                   the cost.
//   Inherited [End of Attack][Once Per Turn] If you have another suspended Digimon,
//             return 1 green Digimon from your trash to your hand.
//
// Fixes:
// 1. The parenthetical is the printed Alliance reminder and is materialized as a Static
//    Alliance keyword, which delegates suspension, DP, and Security Attack to combat.
// 2. digivolutionRequirement: multicolor:true + colors:['Green'] is the established codebase
//    encoding for "2-color w/green" (no colorCount field exists; see interpreter.ts:249,
//    which already requires def.colors.length >= 2 for multicolor:true).
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
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
              levels: [3],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Green"],
            },
            count: 1,
          },
          to: "hand",
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
      colors: ["Green"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-057", compiled);
