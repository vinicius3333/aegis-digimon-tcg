// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4557 (binding): "X in its text" refers to cards containing the specified text in
// name, traits, effects, inherited effects, requirements, etc.
// The [On Play] cost trashes a card from any of your Digimon's digivolution cards (zone:
// digivolutionCards), not a Digimon permanent from the battleArea.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
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
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "digivolutionCards",
                nameOrTrait: [
                  {
                    tokens: ["Appmon"],
                    match: "trait",
                  },
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                    orPrevious: true,
                  },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Appmon]/[Three Musketeers] trait from any of your Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      texts: ["Three Musketeers"],
      cost: 0,
      isAlternate: true,
    },
    {
      traits: ["Appmon"],
      cost: 0,
      isAlternate: true,
      level: 2,
    },
  ],
};

registerIrCard("BT21-054", compiled);
