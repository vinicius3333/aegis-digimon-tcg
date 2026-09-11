import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-245 Kakkinmon (DigiEgg, Lv.2 In-Training, Black, [Armor])
// [Inherited][End of All Turns][Once Per Turn] By suspending 1 of your black Digimon with
//   ＜Blocker＞, if your hand has 7 or fewer cards, ＜Draw 1＞
//
// The clause is inherited-only: the egg prints no main text, so the single effect carries
// `isInherited: true` and fires from the hosting Digimon's stack.
//
// Cost before gate: the suspend is the activation cost and `handAtMost` gates only the draw,
// matching P-224's reading of the same "if your hand has 7 or fewer cards, ＜Draw 1＞" shape.
// The cost target omits an "unsuspended" predicate because the shared suspend cost already
// restricts candidates to unsuspended permanents (interpreter/costs.ts) — the card may suspend
// its own host when the host itself is a black ＜Blocker＞, since the text says "your", not
// "your other". `keywords: ["Blocker"]` matches printed AND granted Blocker (matching/permanent.ts).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfAllTurns",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "handAtMost",
            value: 7,
            raw: "if your hand has 7 or fewer cards",
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                colors: ["Black"],
                keywords: ["Blocker"],
              },
              count: 1,
            },
            raw: "By suspending 1 of your black Digimon with ＜Blocker＞",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

export { compiled };

registerIrCard("P-245", compiled);
