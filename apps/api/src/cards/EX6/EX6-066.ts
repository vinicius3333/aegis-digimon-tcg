// @ts-nocheck
// EX6-066 Sea of Destruction — hand-fixed IR.
// KB Q3817: "the placed card" refers to the Digimon placed from hand (the cost card),
// not the blue host Digimon. Return targets all opponent Digimon at that placed card's level.
//
// Fixes:
//   - Removed colors:["Blue"] from cost target filter (placed card needs no color constraint)
//   - the place cost stores the placed card's level for the following Return target.
//
// nameOrTrait with two tokens in one entry = OR (Aqua OR Sea Animal) — correct per engine.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelEq: "placedCardLevel",
            },
            count: "all",
          },
          to: "hand",
          allowCostWithoutTarget: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Digimon card with [Aqua]/[Sea Animal] in one of its traits from your hand as the bottom digivolution card of 1 of your blue Digimon",
            underFilter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Blue"],
            },
            destination: "digivolutionStack",
            position: "bottom",
            host: "target",
            storeAs: "placedCardLevel",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              superlative: "lowestLevel",
            },
            count: "all",
          },
          to: "hand",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-066", compiled);
