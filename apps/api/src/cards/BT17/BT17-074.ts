// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              kind: ["Tamer"],
              colors: ["White"],
              playCostLte: 4,
            },
            orFilters: [
              {
                controller: "mine",
                zone: "hand",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Eosmon"],
                    match: "name",
                  },
                ],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
              },
            ],
            count: 1,
          },
          from: ["hand"],
          payCost: true,
          costOverride: 2,
          condition: {
            kind: "isYourTurn",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
              kind: ["Tamer"],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          condition: {
            kind: "prevActionTaken",
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          actions: [
            {
              kind: "RedirectAttack",
              target: {
                filter: {
                  controller: "mine",
                  unsuspended: true,
                  nameOrTrait: [
                    {
                      tokens: ["Eosmon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              optional: true,
            },
          ],
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
      names: ["Morphomon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-074", compiled);
