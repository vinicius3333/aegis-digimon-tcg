import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
              playCostLte: 6,
            },
            count: 1,
          },
          playCostCeiling: {
            base: 6,
            raise: 1,
            per: 1,
            filter: {
              controller: "mine",
              zone: "breeding",
              nameOrTrait: [{ tokens: ["Mother Eater"], match: "nameExact" }],
            },
            unit: "digivolutionCardsOfFiltered",
          },
          to: "deckBottom",
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
              kind: ["Digimon", "Tamer"],
              playCostLte: 6,
            },
            count: 1,
          },
          playCostCeiling: {
            base: 6,
            raise: 1,
            per: 1,
            filter: {
              controller: "mine",
              zone: "breeding",
              nameOrTrait: [{ tokens: ["Mother Eater"], match: "nameExact" }],
            },
            unit: "digivolutionCardsOfFiltered",
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Eater"],
                      match: "trait",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfOpponentsTurn",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestPlayCost",
            },
            count: 1,
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Eater Legion"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-075", compiled);
