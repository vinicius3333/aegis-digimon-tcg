import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[When Digivolving] ＜Draw 2＞ (Draw 2 cards from your deck).",
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          effectTextPart:
            "Then, trash 2 cards in your hand. If [Garurumon] or [X Antibody] is in this Digimon's digivolution cards, gain 1 memory.",
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
          effectTextPart:
            "Then, trash 2 cards in your hand. If [Garurumon] or [X Antibody] is in this Digimon's digivolution cards, gain 1 memory.",
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
                  match: "trait",
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
          mode: "prevent",
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
            },
            to: "deckBottom",
            raw: "by returning 2 non-Digi-Egg cards from your trash to the bottom of the deck",
          },
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
