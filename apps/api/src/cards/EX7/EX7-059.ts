import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          effectTextPart: "[On Play] [When Digivolving] Return 1 Option card from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, you may use 1 Option card with the [Three Musketeers] trait from your hand without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
            controller: "mine",
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Return 1 Option card from your trash to the hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
            },
            count: 1,
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, you may use 1 Option card with the [Three Musketeers] trait from your hand without paying the cost.",
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
            controller: "mine",
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "UseOptionWithoutCost",
          filter: {
            kind: ["Option"],
            nameOrTrait: [
              {
                tokens: ["Three Musketeers"],
                match: "trait",
              },
            ],
            controller: "mine",
          },
          payCost: false,
          from: ["hand"],
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "digivolutionCards",
                hostFilter: { isSelfRef: true },
                kind: ["Option"],
              },
              count: 1,
            },
            raw: "By trashing 1 Option card from this Digimon's digivolution cards",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      texts: ["Three Musketeers"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX7-059", compiled);
