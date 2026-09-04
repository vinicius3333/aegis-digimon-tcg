// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Banlist: Restricted to 1 copy (since 2024-03-01).
// Fixes:
// 1. [WhenDigivolving] GainMemory condition kind "selfDigivolutionStackHasTrait" is valid
//    (confirmed in BT5-015); nameOrTrait match for Garurumon OR X Antibody.
// 2. [AllTurns] Replacement cost target: excludeKind:["DigiEgg"] (non-Digi-Egg cards), to: "deckBottom".
// 3. Replacement outcome: "preventDeletion" (the actions[] field is replaced by outcome).
// Q&A Q3562: cannot pay the cost and then allow deletion — must prevent if cost is paid.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 2,
          },
        },
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "selfDigivolutionStackHasTrait",
            filter: {
              nameOrTrait: [
                {
                  tokens: ["Garurumon"],
                  match: "nameExact",
                },
                {
                  tokens: ["X Antibody"],
                  match: "nameExact",
                  orPrevious: true,
                },
              ],
            },
            raw: "[Garurumon] or [X Antibody] is in this Digimon's digivolution cards",
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
};

registerIrCard("EX5-018", compiled);
