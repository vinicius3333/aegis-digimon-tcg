// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// RevealAdd rest is player's choice (top or bottom): deckTopOrBottom.
// AllTurns Replacement cost must restrict to Option cards in digivolution cards.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 6,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Option"],
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "useOption",
              payCost: false,
              optional: true,
            },
          ],
          rest: "deckTopOrBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 6,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Option"],
                nameOrTrait: [
                  {
                    tokens: ["Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              to: "useOption",
              payCost: false,
              optional: true,
            },
          ],
          rest: "deckTopOrBottom",
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
          mode: "prevent",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
          },
          actions: [],
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                kind: ["Option"],
                hostFilter: {
                  isSelfRef: true,
                },
              },
              count: 1,
            },
            raw: "by trashing 1 Option card in this Digimon's digivolution cards, prevent it",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Three Musketeers"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-048", compiled);
