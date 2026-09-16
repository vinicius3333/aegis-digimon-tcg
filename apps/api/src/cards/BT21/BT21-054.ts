import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Digimon"], playCostLte: 3 }, count: 1 },
        },
      ],
    },
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
  linkRequirement: [{ traits: ["Appmon"], cost: 1 }],
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
