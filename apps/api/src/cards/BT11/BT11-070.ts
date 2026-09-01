import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
              count: 1,
              to: "placeUnder",
              underFilter: { isSelfRef: true },
            },
          ],
          rest: "trash",
        },
        {
          kind: "Delete",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: 1 },
          condition: {
            kind: "selfDigivolutionStackCountAtLeast",
            filter: { nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }] },
            count: 5,
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
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              cost: {
                kind: "return",
                target: {
                  filter: {
                    zone: "digivolutionCards",
                    controller: "mine",
                    nameOrTrait: [{ tokens: ["Vemmon"], match: "nameExact" }],
                    hostFilter: {
                      controller: "mine",
                      nameOrTrait: [{ tokens: ["Galacticmon"], match: "nameExact" }],
                    },
                    sameHost: true,
                  },
                  count: 2,
                },
                to: "deckBottom",
                raw: "place 2 [Vemmon] from 1 of your [Galacticmon]'s digivolution cards at the bottom of their owners' decks",
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
  digivolutionRequirement: [{ namesExact: ["Vemmon"], cost: 6, isAlternate: true }],
};

registerIrCard("BT11-070", compiled);
