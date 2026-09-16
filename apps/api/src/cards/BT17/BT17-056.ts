import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Parasitemon"],
                        match: "nameExact",
                      },
                    ],
                  },
                  orFilters: [
                    {
                      controllerDefault: "mine",
                      kind: ["Digimon"],
                      colors: ["Black"],
                      levelComparison: {
                        op: "lte",
                        value: 5,
                      },
                    },
                  ],
                  count: 1,
                  to: "placeUnder",
                  underFilter: {
                    isSelfRef: true,
                  },
                },
              ],
              rest: "trash",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          sourceFilter: {
            isSelfRef: true,
          },
          raw: "When one of your Digimon's effects adds to this Digimon's digivolution cards, this Digimon may digivolve into [GroundLocomon] in the hand without paying the cost",
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["GroundLocomon"],
                    match: "nameExact",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Collision",
              raw: "＜Collision＞",
            },
          },
          while: {
            kind: "youHave",
            filter: {
              isSelfRef: true,
              nameOrTrait: [
                {
                  tokens: ["Machine"],
                  match: "trait",
                },
              ],
            },
            raw: "this Digimon has the [Machine] trait",
          },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-056", compiled);
