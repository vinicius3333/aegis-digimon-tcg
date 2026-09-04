// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX5-034 BanchoLeomon
// Text: "When this card would be played from the hand, if there're 6 or fewer total cards in
//   both players' security stacks, reduce the play cost by 5."
// Text: "[On Play][When Digivolving] Suspend 1 of your opponent's Digimon."
// Text: "[All Turns][Once Per Turn] When a Digimon becomes suspended, you may have 1 of your
//   opponent's Digimon get -4000 DP and gain <Security Attack -1> until the end of their turn."
// KB Q3600: security total = sum of both players' security cards
// Fix: the "you may" applies to the whole package (choose a target and apply BOTH effects
//   together). Use a single optional compound action binding the target once.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "automatic",
            condition: {
              kind: "totalSecurityCount",
              op: "lte",
              value: 6,
              raw: "there're 6 or fewer total cards in both players' security stacks",
            },
          },
          amount: { kind: "fixed", value: 5 },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          // Printed "a Digimon" observes either player's newly-suspended Digimon.
          sourceFilter: { kind: ["Digimon"] },
          actions: [
            {
              kind: "SelectBind",
              chooser: "controller",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                bindAs: "ex5034OptionalTarget",
              },
              optional: true,
              abortOnDecline: true,
              reason: "applyBothEffects",
            },
            {
              kind: "ModifyDP",
              target: {
                filter: {},
                count: 1,
                fromSelectionRef: "ex5034OptionalTarget",
              },
              amount: -4000,
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {},
                count: 1,
                fromSelectionRef: "ex5034OptionalTarget",
              },
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security Attack -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-034", compiled);
