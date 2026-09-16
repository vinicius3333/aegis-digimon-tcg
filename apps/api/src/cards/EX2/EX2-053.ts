import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                playCostLte: 10,
                nameOrTrait: [
                  {
                    tokens: ["D-Reaper"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "deckTop",
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mother D-Reaper"],
                  match: "nameExact",
                },
              ],
              digivolutionCardsAtLeast: 5,
            },
            raw: "one of your [Mother D-Reaper]s has 5 or more digivolution cards",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                playCostLte: 10,
                nameOrTrait: [
                  {
                    tokens: ["D-Reaper"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "play",
              optional: true,
            },
          ],
          rest: "deckTop",
          condition: {
            kind: "youHave",
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Mother D-Reaper"],
                  match: "nameExact",
                },
              ],
              digivolutionCardsAtLeast: 5,
            },
            raw: "one of your [Mother D-Reaper]s has 5 or more digivolution cards",
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-053", compiled);
