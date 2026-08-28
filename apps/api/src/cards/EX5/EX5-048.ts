// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Text: [On Play][When Digivolving] Until the end of your opponent's turn, 1 of your opponent's
// Digimon gets -3000 DP and gains "[Start of Your Main Phase] This Digimon attacks."
// KB Q3625: if two Digimon gain this effect, both triggers fire simultaneously at start of
// opponent's main phase but only the first attacker actually attacks (the second can't).
// Inherited [Opponent's Turn][Once Per Turn]: When an opponent's Digimon attacks, you may
// reveal the top 3 cards of your deck. You may play 1 black or yellow Digimon with a play
// cost of 3 or less among them without paying the cost. Trash the rest.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            // Bind the selected Digimon so the GainEffect below can reference it.
            bindAs: "dpTarget",
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          // Grant the SAME targeted Digimon "[Start of Your Main Phase] This Digimon attacks."
          // Uses GainEffect (new primitive — see LANE_A.md CAP-A12).
          kind: "GainEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "dpTarget",
          },
          grant: {
            trigger: "StartOfYourMainPhase",
            actions: [
              {
                kind: "Attack",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
            ],
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "dpTarget",
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            fromSelectionRef: "dpTarget",
          },
          grant: {
            trigger: "StartOfYourMainPhase",
            actions: [
              {
                kind: "Attack",
                target: {
                  filter: {
                    isSelfRef: true,
                  },
                  count: 1,
                  isSelf: true,
                },
              },
            ],
          },
          duration: "untilOpponentTurnEnd",
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
              // "You may reveal" — optional reveal.
              kind: "RevealAdd",
              revealCount: 3,
              add: [
                {
                  filter: {
                    controllerDefault: "mine",
                    kind: ["Digimon"],
                    colors: ["Black", "Yellow"],
                    playCostLte: 3,
                  },
                  count: 1,
                  to: "play",
                  optional: true,
                },
              ],
              rest: "trash",
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
      level: 4,
      names: ["Sukamon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX5-048", compiled);
