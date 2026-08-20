// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-authored override for BT23-032 (Shakkoumon).
// Text:
//   [When Digivolving] Until your opponent's turn ends, give 1 of their Digimon
//   "[Start of Your Main Phase] This Digimon attacks." Then, if DNA digivolving,
//   ＜De-Digivolve 1＞ 1 of your opponent's Digimon.
//   [All Turns] [Once Per Turn] When this Digimon would leave the battle area other than
//   by your effects, you may play 1 level 4 or lower yellow, black or [CS] trait Digimon
//   card from its digivolution cards without paying the cost.
//   [Inherited] Same as the [All Turns] effect above.
// KB Q5278/Q5279: "1 level 4 or lower yellow or black Digimon card, OR 1 level 4 or lower
//   [CS] trait Digimon card." (OR, not AND)
// Fixes vs AUTO-GENERATED:
//   - GrantAuraToOpponents effectText updated to describe the actual granted trigger
//   - Replacement filter changed from AND (colors+CS) to orFilters: yellow/black OR CS-trait
//   - leaveCause added: otherThanYourEffect (text: "other than by your effects")
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GrantAuraToOpponents",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          effectText: "[Start of Your Main Phase] This Digimon attacks.",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DeDigivolve",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: 1,
          condition: {
            kind: "isDnaDigivolving",
            raw: "DNA digivolving",
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
                  colors: ["Yellow", "Black"],
                  levelComparison: {
                    op: "lte",
                    value: 4,
                  },
                },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [
                      {
                        tokens: ["CS"],
                        match: "trait",
                      },
                    ],
                    levelComparison: {
                      op: "lte",
                      value: 4,
                    },
                  },
                ],
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  colors: ["Yellow", "Black"],
                  levelComparison: { op: "lte", value: 4 },
                },
                orFilters: [
                  {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
                    levelComparison: { op: "lte", value: 4 },
                  },
                ],
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
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
};

registerIrCard("BT23-032", compiled);
