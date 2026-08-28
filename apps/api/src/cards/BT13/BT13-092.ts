// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Trash",
          target: { filter: { controller: "opponent", zone: "hand" }, count: 1 },
          chooser: "opponent",
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "opponent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "lte",
            value: 7,
            raw: "they have 7 or fewer cards in their hand",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
          cost: {
            kind: "return",
            target: {
              filter: {
                zone: "trash",
                controller: "opponent",
                kind: ["Digimon"],
              },
              count: 1,
            },
            raw: "By returning 1 Digimon card from your opponent's trash to the bottom of the deck",
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
      namesExact: ["Ravemon"],
      cost: 0,
      isAlternate: true,
      burstDigivolve: { returnTamerNamesExact: ["Keenan Crier"] },
    },
  ],
};

registerIrCard("BT13-092", compiled);
