// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const plantTraits = [
  { tokens: ["Vegetation"], match: "trait" },
  { tokens: ["Plant"], match: "trait" },
  { tokens: ["Fairy"], match: "trait" },
];

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      description: "[When Digivolving] You may suspend 1 Digimon.",
      actions: [
        {
          kind: "Suspend",
          target: { filter: { kind: ["Digimon"], suspended: false }, count: 1 },
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      description:
        "[All Turns][Once Per Turn] When an opponent's Digimon becomes suspended, for each other suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits you have in play, gain 1 memory.",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { controller: "opponent", kind: ["Digimon"] },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
              scaling: {
                per: 1,
                unit: "cards",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  suspended: true,
                  excludeSelf: true,
                  nameOrTrait: plantTraits,
                },
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      timingOverride: "OnEndTurn",
      description:
        "[End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
          to: "deckBottom",
          condition: {
            kind: "allOf",
            conditions: [
              { kind: "isYourTurn" },
              {
                kind: "youHave",
                filter: {
                  controller: "mine",
                  zone: "battleArea",
                  kind: ["Digimon"],
                  suspended: true,
                  nameOrTrait: plantTraits,
                },
                countMin: 2,
              },
            ],
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-045", compiled);
