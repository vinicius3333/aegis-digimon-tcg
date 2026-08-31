// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT19-100 D-Reaper Zone — Option card
// [Security] [Opponent's Turn] When an opponent's Digimon attacks, if all of your Digimon
//   and Tamers have the [D-Reaper] trait, for each of 1 of your [Mother D-Reaper]'s
//   digivolution cards, the attacking Digimon gets -1000 DP for the turn.
// [Main] If you have no face-up security cards, by trashing your top security card, place
//   this card face up as your top security card.
// [Security check] You may play 1 [D-Reaper] trait card with a play cost equal to or lower
//   than the number of digivolution cards of 1 of your [Mother D-Reaper]'s from your hand
//   without paying the cost.
//
// KB Q3176-Q3178: "all of your Digimon and Tamers" = battle area only.
// KB Q3181: Security check effect must activate (not optional) when triggered.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          fireCondition: {
            kind: "allYoursMatchFilter",
            filter: {
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["D-Reaper"], match: "trait" }],
            },
            raw: "all of your Digimon and Tamers in the battle area have the [D-Reaper] trait",
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  isAttacking: true,
                },
                count: 1,
              },
              amount: -1000,
              duration: "forTheTurn",
              scaling: {
                per: 1,
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
                },
                unit: "digivolutionCardsOfFiltered",
              },
            },
          ],
          raw: "When an opponent's Digimon attacks, if all of your Digimon and Tamers have the [D-Reaper] trait, DP reduction scaled by Mother D-Reaper digivolution cards",
        },
      ],
      isSecurity: true,
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "this",
          faceUp: true,
          condition: {
            kind: "youHaveNone",
            filter: {
              controller: "mine",
              zone: "security",
              faceUp: true,
            },
            raw: "you have no face-up security cards",
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
              },
              count: 1,
            },
            raw: "by trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              playCostLte: 0,
              playCostLteScaling: {
                per: 1,
                filter: {
                  controller: "mine",
                  nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "nameExact" }],
                },
                unit: "digivolutionCardsOfFiltered",
              },
              nameOrTrait: [
                {
                  tokens: ["D-Reaper"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT19-100", compiled);
