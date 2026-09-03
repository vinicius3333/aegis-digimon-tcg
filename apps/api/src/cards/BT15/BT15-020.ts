// Hand-authored override for BT15-020 (runtime-effect fix).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// The card-data feed omits the printed ＜Blocker＞ token and leaves only its reminder text,
// so the prose compiler cannot recover this grant. Preserve the explicit action here:
// [Start of Your Main Phase] 1 of your Digimon gains ＜Blocker＞ until the end of your
// opponent's turn. Then, if you have a Tamer with [Matt Ishida] in its name, Draw 1.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Blocker",
            raw: "＜Blocker＞",
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Matt Ishida"],
                  match: "name",
                },
              ],
            },
            raw: "you have a Tamer with [Matt Ishida] in its name",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT15-020", compiled);
