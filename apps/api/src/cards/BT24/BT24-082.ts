// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-082 Owen Dreadnought (Tamer)
// Text:
//   [Start of Your Main Phase] By returning this Tamer to the bottom of the deck,
//   you may play 1 [Owen Dreadnought] from your hand without paying the cost. Then,
//   if you don't have a Digimon, you may play 1 [Elizamon] from your trash without
//   paying the cost.
//   [Your Turn] When any of your Digimon digivolve into a [Reptile] or [Dragonkin]
//   Digimon, by suspending this Tamer, that Digimon gets +3000 DP for the turn.
//   Then, it may attack.
//
// KB Q5663: "Then" after "by" cannot be processed without meeting the by-condition.
// KB Q5665: Attack cannot happen if you don't suspend this Tamer.
//
// Fixes:
//   1. SubTrigger actions was empty — add ModifyDP (+3000 DP for the digivolving Digimon).
//   2. Attack action was outside the SubTrigger — move inside (it's the "Then" clause).
//   3. sourceFilter for whenOneOfYoursDigivolves: fires POST-digivolve so trait check
//      on the resulting Digimon is correct.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Owen Dreadnought"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            raw: "By returning this Tamer to the bottom of the deck",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [{ tokens: ["Elizamon"], match: "nameExact" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "youHaveNone",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon"],
            },
            raw: "you don't have a Digimon",
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Reptile", "Dragonkin"], match: "trait" }],
          },
          cost: {
            kind: "suspend",
            target: {
              filter: { isSelfRef: true },
              count: 1,
              isSelf: true,
            },
            optional: true,
            raw: "by suspending this Tamer",
          },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                sourceRef: "triggerSubject",
                count: 1,
              },
              amount: 3000,
              duration: "forTheTurn",
            },
            {
              kind: "Attack",
              target: {
                sourceRef: "triggerSubject",
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-082", compiled);
