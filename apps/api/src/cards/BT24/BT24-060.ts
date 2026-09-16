import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          digivolveOption: {
            into: {
              controllerDefault: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["DigiPolice", "SEEKERS"],
                  match: "trait",
                },
              ],
            },
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            payCost: false,
            optional: true,
          },
          add: [],
          rest: "deckTopOrBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "onAddDigivolutionCards",
          triggerFilter: {
            isSelfRef: true,
          },
          addedDigivolutionCardFilter: {
            kind: ["Tamer"],
          },
          actions: [
            {
              effectTextPart:
                "[All Turns] When Tamer cards are placed in this Digimon's digivolution cards, suspend 1 of your opponent's Digimon.",
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
            },
            {
              effectTextPart: "Then, this Digimon may attack your opponent's Digimon.",
              kind: "Attack",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              attackPlayer: false,
              optional: true,
            },
          ],
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
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["DigiPolice", "SEEKERS"],
                match: "trait",
              },
            ],
          },
          affectsAll: true,
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
            },
          ],
          cost: {
            kind: "playFromDigivolutionCards",
            target: {
              filter: {
                controller: "mine",
                kind: ["Tamer"],
                nameOrTrait: [
                  {
                    tokens: ["DigiPolice", "SEEKERS"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
            },
            hostTarget: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by playing 1 [DigiPolice] or [SEEKERS] trait Tamer card from this Digimon's digivolution cards without paying the cost",
          },
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
      level: 4,
      traits: ["DigiPolice", "SEEKERS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT24-060", compiled);
