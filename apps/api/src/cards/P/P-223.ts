// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-223 Kuzuhamon
// effectText:
//   [Digivolve] Lv.6 w/[Maid Mode] in name: Cost 1
//   When this card would be played, if you have 3 or fewer security cards, reduce the play cost by 4.
//   [On Play][When Digivolving] You may use 1 [Onmyōjutsu] or [Plug-In] Option card from your hand
//     or trash without paying the cost.
//   [All Turns][Once Per Turn] When you use Option cards, you may play 1 [Pipe Fox] Token.
//
// Audit fixes:
// - [All Turns] was a bare PlayToken action — should be a SubTrigger for whenOptionUsed.
//   KB Q5772: triggers after the Option's Main effect activates.
//   KB Q5773: does NOT trigger for Security or <Delay> activations of Option effects.
// - Added optional:true on PlayToken (text says "you may").
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 4,
              raw: "reduce the play cost by 4",
              condition: {
                kind: "zoneCount",
                seat: "mine",
                zone: "security",
                op: "lte",
                value: 3,
                raw: "you have 3 or fewer security cards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            playCostLte: 99,
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            playCostLte: 99,
            nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }],
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      // [All Turns][Once Per Turn] When you use Option cards (KB Q5773: not Security/Delay),
      // you may play 1 [Pipe Fox] Token.
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          sourceFilter: {
            controller: "mine",
            kind: ["Option"],
          },
          actions: [
            {
              kind: "PlayToken",
              tokens: ["Pipe Fox"],
              count: 1,
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 6,
      names: ["Maid Mode"],
      cost: 1,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-223", compiled);
