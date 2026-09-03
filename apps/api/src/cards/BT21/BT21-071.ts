import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        { kind: "Draw", controller: "mine", amount: 2 },
        { kind: "Trash", target: { filter: { controller: "mine", zone: "hand" }, count: 2 } },
      ],
    },
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
  linkRequirement: [{ traits: ["Appmon"], cost: 2 }],
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
