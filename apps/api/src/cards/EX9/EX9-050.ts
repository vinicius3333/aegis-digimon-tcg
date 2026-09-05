// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX9-050 Numemon
// [End of Your Turn] [Once Per Turn] By placing 3 [Ver.1] trait Digimon cards from your
// trash face down as this Digimon's bottom digivolution cards, it may digivolve into a
// [Ver.1] trait Digimon card in the hand or trash.
// [inherited] [Static] <Blocker>
// Q4805: All 3 cards must be placed; partial cost cannot be met.
// The place cost already encodes faceDown/position/host correctly.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "EndOfYourTurn",
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
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Ver.1"],
                match: "trait",
              },
            ],
          },
          from: ["hand", "trash"],
          payCost: true,
          optional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Ver.1"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
              from: ["trash"],
            },
            raw: "By placing 3 Digimon cards with the [Ver.1] trait from your trash face down as this Digimon's bottom digivolution cards",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            faceDown: true,
          },
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["DM"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX9-050", compiled);
