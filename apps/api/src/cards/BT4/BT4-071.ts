import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
                        match: "nameExact",
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
