// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT4-071 Tankdramon
// [Your Turn] When one of your other Digimon with [D-Brigade] in its type is deleted,
//   reveal the top 2 cards of your deck. You may play 1 [Commandramon] among them
//   without paying its memory cost. Place the remaining cards at the bottom of your
//   deck in any order.
//
// The trigger is [Your Turn] + SubTrigger onDeletionOf. The play-from-revealed is
// encoded inside RevealAdd.add with to:"play" and optional:true so the player may
// decline. The remaining non-chosen cards go to deckBottom.
//
// KB Q&A Q1222: if 2 copies are deleted simultaneously, both effects fire but
// can't activate since the cards are already in trash — engine-level ruling.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDeletionOf",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["D-Brigade"],
                match: "trait",
              },
            ],
          },
          notSimultaneous: true,
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 2,
              add: [
                {
                  filter: {
                    nameOrTrait: [
                      {
                        tokens: ["Commandramon"],
                        match: "name",
                      },
                    ],
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "deckBottom",
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-071", compiled);
