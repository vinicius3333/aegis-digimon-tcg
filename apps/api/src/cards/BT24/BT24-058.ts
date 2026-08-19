// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-058 Blimpmon
// The revealed card is selected once, then the controller chooses its printed destination:
// hand OR the bottom of one qualifying Machine/Cyborg/TS Digimon.
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
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Machine", "Cyborg", "TS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
              orFilters: [{ kind: ["Tamer"] }],
              orDispositions: [
                {
                  to: "placeUnder",
                  underFilter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Machine", "Cyborg", "TS"],
                        match: "trait",
                      },
                    ],
                  },
                },
              ],
            },
          ],
          rest: "deckTopOrBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Machine", "Cyborg", "TS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "hand",
              orFilters: [{ kind: ["Tamer"] }],
              orDispositions: [
                {
                  to: "placeUnder",
                  underFilter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Machine", "Cyborg", "TS"],
                        match: "trait",
                      },
                    ],
                  },
                },
              ],
            },
          ],
          rest: "deckTopOrBottom",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["TS"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-058", compiled);
