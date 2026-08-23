// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-054 Wendigomon
// Text: "Digivolve: 2 from Lv.3 w/[Terriermon] or [Lopmon] in name"
// Digivolve inherited ability: "(When this Digimon attacks, by suspending 1 of your other
//   Digimon, this Digimon adds the suspended Digimon's DP and gains <Security Attack +1>
//   for the attack.)"
// Inherited effect: "[End of Attack][Once Per Turn] If you have another suspended Digimon in
//   play, return 1 Green Digimon card from your trash to your hand."
// No KB entries. Attack-inherited matches EX4-029 / EX4-035 pattern exactly.
// Fixes:
//   - Add the missing WhenAttacking inherited AddDPFromSuspendedCost effect (main finding)
//   - Preserve the existing EndOfAttack inherited effect (it was correct)
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "AddDPFromSuspendedCost",
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                zone: "battleArea",
                kind: ["Digimon"],
                excludeSelf: true,
              },
              count: 1,
            },
            raw: "by suspending 1 of your other Digimon",
          },
          dpSource: {
            kind: "suspendedTarget",
          },
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "forThisAttack",
          alsoGainKeywords: [
            {
              keyword: "SecurityAttack",
              amount: 1,
              raw: "＜Security Attack +1＞",
            },
          ],
        },
      ],
      isInherited: true,
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
      level: 3,
      names: ["Terriermon"],
      cost: 2,
      isAlternate: true,
    },
    {
      level: 3,
      names: ["Lopmon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-054", compiled);
