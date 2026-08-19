// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Place cost: card with [Appmon] or [Three Musketeers] trait (any kind) from hand/trash
// placed as bottom digivolution card under 1 of your own Digimon (not self).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Appmon", "Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By placing 1 card with the [Appmon]/[Three Musketeers] trait from your hand or trash as 1 of your Digimon's bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Appmon", "Three Musketeers"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand", "trash"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By placing 1 card with the [Appmon]/[Three Musketeers] trait from your hand or trash as 1 of your Digimon's bottom digivolution card",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      texts: ["Three Musketeers"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-071", compiled);
