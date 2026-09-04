// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX4-054 Wendigomon
// Text: "Digivolve: 2 from Lv.3 w/[Terriermon] or [Lopmon] in name"
// Digivolve reminder: "(When this Digimon attacks, by suspending 1 of your other Digimon,
//   this Digimon adds the suspended Digimon's DP and gains <Security Attack +1> for the
//   attack.)" This is the printed <Alliance> keyword reminder, not a second effect.
// Inherited effect: "[End of Attack][Once Per Turn] If you have another suspended Digimon in
//   play, return 1 Green Digimon card from your trash to your hand."
// No KB entries. Alliance matches EX4-031 / EX4-059's static keyword pattern exactly.
// Fixes:
//   - Model the parenthetical Alliance reminder as the non-inherited Static keyword.
//   - Preserve the existing EndOfAttack inherited effect (it was correct)
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
