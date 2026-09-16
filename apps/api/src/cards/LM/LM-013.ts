import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "[Hand] [Counter] (Your Digimon may digivolve into this card without paying the cost)",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, if they have no unsuspended Digimon, gain 2 memory.",
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "opponentHasNone",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            raw: "they have no unsuspended Digimon",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend 1 of your opponent's Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
        },
        {
          effectTextPart: "Then, if they have no unsuspended Digimon, gain 2 memory.",
          kind: "GainMemory",
          amount: 2,
          condition: {
            kind: "opponentHasNone",
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              suspended: false,
            },
            raw: "they have no unsuspended Digimon",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Angoramon"], match: "text" }],
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          optional: true,
          bindResultAs: "playedAngoramon",
        },
        {
          kind: "DelayedEffect",
          effect: {
            kind: "Return",
            target: {
              filter: {
                boundRef: "playedAngoramon",
              },
              count: 1,
            },
            to: "hand",
          },
          trigger: "nextEndOfOpponentTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("LM-013", compiled);
