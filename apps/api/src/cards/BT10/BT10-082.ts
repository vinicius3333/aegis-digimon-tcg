// @ts-nocheck
// HAND-FIXED IR — only the deck mill is optional; the scaled deletion is mandatory.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "trash",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 3,
          optional: true,
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "trash",
          },
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "trash",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Xros Heart"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT10-082", compiled);
