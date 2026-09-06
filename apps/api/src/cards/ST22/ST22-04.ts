// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// ST22-04 Taomon
// [On Play] [When Digivolving] Until your opponent's turn ends, 1 of their Digimon
//   can't activate [When Digivolving] effects and gets -3000 DP.
// [When Attacking] [Once Per Turn] You may use 1 Option card with the [Onmyōjutsu]
//   or [Plug-In] trait from your hand or under your Tamers without paying the cost.
// [Inherited] [End of Attack] [Once Per Turn] By trashing your top security card,
//   1 of your Digimon with [Sakuyamon] in its name unsuspends.
// Q5415: used Option card is temporarily treated as not in any area → UseOptionWithoutCost
// Q5410–Q5414: DisableTimingEffect blocks [When Digivolving] at all activation paths
const compiled: CompiledCard = {
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
            bindAs: "onPlayTarget",
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            fromSelectionRef: "onPlayTarget",
          },
          timings: ["whenDigivolving"],
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
            bindAs: "whenDigivolvingTarget",
          },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "DisableTimingEffect",
          target: {
            fromSelectionRef: "whenDigivolvingTarget",
          },
          timings: ["whenDigivolving"],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            controller: "mine",
            kind: ["Option"],
            nameOrTrait: [
              { tokens: ["Onmyōjutsu"], match: "trait" },
              { tokens: ["Plug-In"], match: "trait" },
            ],
          },
          from: ["hand", "underTamers"],
          payCost: false,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Sakuyamon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
                position: "top",
              },
              count: 1,
            },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("ST22-04", compiled);
