// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Garurumon", "X Antibody"],
                    match: "name",
                  },
                ],
              },
              count: 2,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "you added cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 4,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Garurumon", "X Antibody"],
                    match: "name",
                  },
                ],
              },
              count: 2,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
          condition: {
            kind: "ifThisEffectActed",
            raw: "you added cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "byBattle",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Garurumon", "Omnimon"],
                match: "name",
              },
            ],
          },
          actions: [],
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                excludeKind: ["DigiEgg"],
              },
              count: 2,
              to: "deckBottom",
            },
            raw: "by returning 2 non-Digi-Egg cards from your trash to the bottom of the deck",
          },
          outcome: "preventDeletion",
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
      names: ["Gabumon"],
      cost: 0,
      isAlternate: true,
    },
    {
      names: ["Tsunomon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX5-015", compiled);
