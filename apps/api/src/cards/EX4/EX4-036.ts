// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX4-036 (BlackRapidmon).
// Text:
//   [Main] Digivolve from Lv.4 w/[Gargomon] in name (cost 3) or 2-color w/green Lv.4 (cost 3).
//   [End of Attack] Trash digivolution cards from the top of 1 of your opponent's Digimon
//                   until you reach a level 3 card or trash the last card. Then <De-Digivolve 1>
//                   targeting 1 of your opponent's Digimon.
//   Inherited [Your Turn][Once Per Turn] When an effect suspends another Digimon
//             (not this one), this Digimon gains <Piercing> for the turn.
//
// KB Q3482: <De-Digivolve 1> targets 1 of your opponent's Digimon.
// KB Q3483: Gaining <Piercing> after the battle doesn't help with security checks.
// KB Q3484: Both digivolution paths require a Lv.4 Digimon.
// KB note on names:[Gargomon] — text says "w/[Gargomon] in name" meaning name contains "Gargomon"
//           (substring match), not exact match.
//
// Digivolution fix: multicolor:true requires exactly 2+ colors AND must include green.
// The existing IR uses multicolor:true + colors:['Green'] which is correct for "2-color w/green".
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "TrashDigivolution",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          fromTop: true,
          amount: 99,
          stopAtLevel: 3,
        },
        {
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
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
            excludeSelf: true,
          },
          actions: [
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              keyword: {
                keyword: "Piercing",
                raw: "＜Piercing＞",
              },
              duration: "forTheTurn",
            },
          ],
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
      names: ["Gargomon"],
      cost: 3,
      isAlternate: true,
    },
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
registerIrCard("EX4-036", compiled);
