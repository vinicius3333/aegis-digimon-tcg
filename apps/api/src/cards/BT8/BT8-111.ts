import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
          scaling: {
            per: 1,
            filter: {
              zone: "battleArea",
              controller: "opponent",
              kind: ["Digimon"],
            },
            unit: "cards",
          },
          trackCount: "creepymonMilled",
        },
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "namedCountAtLeast",
            countSource: "creepymonMilled",
            count: 4,
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "opponent",
          amount: 3,
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "cards",
          },
        },
        {
          kind: "ModifyDP",
          continuous: false,
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 3000,
          duration: "forTheTurn",
          scaling: {
            per: 10,
            filter: {
              zone: "trash",
              controller: "mine",
            },
            unit: "cards",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-111", compiled);
