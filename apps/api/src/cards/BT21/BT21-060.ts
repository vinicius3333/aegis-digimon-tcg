import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "StackTrashLock",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          duration: "untilOpponentTurnEnd",
        },
        {
          effectTextPart:
            "Then, to 1 of your opponent's Digimon, ＜De-Digivolve 1＞ for every 2 [Vemmon] in this Digimon's digivolution cards.",
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          scaling: {
            per: 2,
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Vemmon"],
                  match: "nameExact",
                },
              ],
            },
            unit: "digivolutionCards",
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
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  isSelfRef: true,
                  controller: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Vemmon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
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
              kind: "EndAttack",
              cost: {
                kind: "return",
                target: {
                  filter: {
                    isSelfRef: true,
                    controller: "mine",
                    zone: "digivolutionCards",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["Vemmon"],
                        match: "nameExact",
                      },
                    ],
                  },
                  count: 2,
                },
                to: "deckBottom",
                raw: "by returning 2 [Vemmon] from this Digimon's digivolution cards to the bottom of the deck",
              },
              optional: true,
              abortOnDecline: true,
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
      namesExact: ["Vemmon"],
      cost: 6,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-060", compiled);
