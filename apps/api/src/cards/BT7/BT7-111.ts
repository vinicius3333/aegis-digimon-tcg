import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          mode: "reduceCost",
          amount: 3,
          raw: "reduce the memory cost when playing this card from your hand by 3",
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            orFilters: [
              {
                controller: "opponent",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
              },
            ],
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Tamer"],
            },
            orFilters: [
              {
                controller: "opponent",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
              },
            ],
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Lucemon"],
      cost: 7,
      isAlternate: true,
      sourceZones: ["hand"],
    },
  ],
};

registerIrCard("BT7-111", compiled);
