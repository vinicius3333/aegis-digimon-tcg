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
                filter: { controller: "mine", kind: ["Digimon"], suspended: true, nameOrTrait: plantTraits },
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], suspended: true }, count: 1 },
          to: "deckBottom",
          condition: {
            kind: "youHave",
            filter: { controller: "mine", kind: ["Digimon"], suspended: true, nameOrTrait: plantTraits },
            countMin: 2,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX3-045", compiled);
