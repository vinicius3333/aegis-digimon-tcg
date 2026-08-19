// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-075 (Eater EDEN).
// Text:
//   [Digivolve] [Eater Legion]: Cost 3
//   [On Play] [When Digivolving] Return 1 of your opponent's play cost 6 or lower Digimon
//   or Tamers to the bottom of the deck. For each of your [Mother Eater]'s digivolution
//   cards in the breeding area, add 1 to this effect's play cost maximum.
//   [All Turns] When this Digimon would leave the battle area other than by your effects,
//   you may play 1 [Eater] Digimon card from your hand without paying the cost.
//   [End of Opponent's Turn] [Once Per Turn] Delete 1 of your opponent's lowest play cost
//   Digimon.
// Fixes vs AUTO-GENERATED:
//   - Dynamic return ceiling counts Mother Eater digivolution cards in the breeding area
//   - Replacement: added leaveCause:"otherThanYourEffect" (text: "other than by your effects")
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
              nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }],
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
              nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }],
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
      names: ["Eater Legion"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-075", compiled);
