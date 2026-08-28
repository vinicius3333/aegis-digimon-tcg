// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
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
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                colors: ["Red", "Black"],
                levels: [5],
                nameOrTrait: [
                  {
                    tokens: ["Cyborg"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
              upTo: true,
              distinctCardNumbers: true,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "By placing up to 3 red and black level 5 cards with [Cyborg] in their traits and different card numbers from your hand and trash under this Digimon as its bottom digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
          scaling: {
            per: 1,
            usePaidCount: true,
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
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
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                colors: ["Red", "Black"],
                levels: [5],
                nameOrTrait: [
                  {
                    tokens: ["Cyborg"],
                    match: "trait",
                  },
                ],
              },
              count: 3,
              upTo: true,
              distinctCardNumbers: true,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
            raw: "By placing up to 3 red and black level 5 cards with [Cyborg] in their traits and different card numbers from your hand and trash under this Digimon as its bottom digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
          scaling: {
            per: 1,
            usePaidCount: true,
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: {
            isSelfRef: true,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                isSelfRef: true,
                kind: ["Digimon"],
                levels: [5],
              },
              count: 2,
            },
            raw: "by trashing 2 level 5 cards in this Digimon's digivolution cards",
          },
          optional: true,
          raw: "When this Digimon would be deleted or returned to your hand or deck, you may trash 2 level 5 cards in this Digimon's digivolution cards to prevent it from leaving play",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Machinedramon"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX3-013", compiled);
