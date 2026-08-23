// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4807: can play Digimon or Tamer cards.
// Base play cost max is 4; scales +1 per face-down digivolution card of this Digimon.
// KB Q4807 confirms both Digimon and Tamer are eligible — kind filter is omitted.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Collision",
          raw: "＜Collision＞",
        },
      ],
    },
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
                playCostLte: 4,
                playCostLteScaling: {
                  per: 1,
                  unit: "selfFaceDownDigivolutionCards",
                },
                nameOrTrait: [
                  {
                    tokens: ["DM"],
                    match: "trait",
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
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                playCostLte: 4,
                playCostLteScaling: {
                  per: 1,
                  unit: "selfFaceDownDigivolutionCards",
                },
                nameOrTrait: [
                  {
                    tokens: ["DM"],
                    match: "trait",
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
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
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
      level: 4,
      traits: ["DM"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-053", compiled);
