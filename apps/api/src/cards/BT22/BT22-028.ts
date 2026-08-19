// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT22-028 (Ariemon).
// Text:
//   ＜Decode (Lv.6 or lower w/[Aqua]/[Sea Animal] in any trait)＞
//   [When Digivolving] You may play 1 each of level 3, level 4 and level 5 Digimon cards
//   with [Aqua] or [Sea Animal] in any of their traits from this Digimon's digivolution
//   cards without paying the cost.
//   [When Digivolving] [When Attacking] [Once Per Turn] By placing 1 of your other Digimon
//   as this Digimon's bottom digivolution card, return 1 of your opponent's Digimon to the
//   bottom of the deck and this Digimon unsuspends.
// Fixes vs AUTO-GENERATED:
//   - WhenDigivolving play: three separate PlayWithoutCost actions (one per level: 3, 4, 5)
//     all non-optional per KB Q5213 ("must play 1 each ... whenever possible").
//   - orFilters on trait: "Aqua" OR "Sea Animal" — text says "with [Aqua] or [Sea Animal]
//     in any of their traits" (each card need only have ONE of the two traits).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.6 or lower w/[Aqua]/[Sea Animal] in any trait)＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [3],
              nameOrTrait: [
                {
                  tokens: ["Aqua"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levels: [3],
                nameOrTrait: [
                  {
                    tokens: ["Sea Animal"],
                    match: "trait",
                  },
                ],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: false,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [4],
              nameOrTrait: [
                {
                  tokens: ["Aqua"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levels: [4],
                nameOrTrait: [
                  {
                    tokens: ["Sea Animal"],
                    match: "trait",
                  },
                ],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: false,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levels: [5],
              nameOrTrait: [
                {
                  tokens: ["Aqua"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "mine",
                kind: ["Digimon"],
                levels: [5],
                nameOrTrait: [
                  {
                    tokens: ["Sea Animal"],
                    match: "trait",
                  },
                ],
              },
            ],
            count: 1,
          },
          from: ["digivolutionCards"],
          payCost: false,
          optional: false,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By placing 1 of your other Digimon as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
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
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                excludeSelf: true,
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By placing 1 of your other Digimon as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "Unsuspend",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Yao Qinglan", "MarineBullmon"],
      cost: 6,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-028", compiled);
