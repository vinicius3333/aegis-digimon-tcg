// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX8-026 MetalSeadramon
// [Digivolve] Lv.5 w/[DS] trait: Cost 3
// [Counter] <Blast Digivolve>
// [On Play] [When Digivolving] <De-Digivolve 1> 1 of your opponent's Digimon. Then, return
//   1 of your opponent's Digimon with a play cost of 7 or less to the bottom of the deck.
// [All Turns] While you have 1 or more memory, none of your opponent's Digimon can suspend.
// Q3892: "1 or more memory" = memory gauge at 1 or further left on your side.
// Q3893: Blitz attacks also blocked since the Digimon cannot suspend at all.
// [Rule] Trait: Has the [Aquatic] type.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
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
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 7,
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
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
        },
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              playCostLte: 7,
            },
            count: 1,
          },
          to: "deckBottom",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          restriction: "suspend",
          duration: "whileCondition",
          while: {
            kind: "memoryAtLeast",
            value: 1,
            controller: "mine",
          },
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["DS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-026", compiled);
