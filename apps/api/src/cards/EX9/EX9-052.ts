// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [End of Your Turn] cost: place exactly 3 [Ver.5] trait Digimon from trash face down
// as this Digimon's bottom digivolution cards. KB Q4806: cannot meet cost with only 2 cards.
// faceDown:true, position:"bottom", host:"self" encode the face-down bottom placement.
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
                tokens: ["Ver.5"],
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
                    tokens: ["Ver.5"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
              from: ["trash"],
            },
            raw: "By placing 3 Digimon cards with the [Ver.5] trait from your trash face down as this Digimon's bottom digivolution cards",
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
      trigger: "OnDeletion",
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

registerIrCard("EX9-052", compiled);
