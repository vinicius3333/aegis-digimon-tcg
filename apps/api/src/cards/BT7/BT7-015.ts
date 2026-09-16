import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 1,
          handResident: true,
          duration: "permanent",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          scaling: {
            per: 1,
            filter: {
              zone: "trash",
              kind: ["Option"],
            },
            unit: "cards",
          },
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                zone: "trash",
                kind: ["Option"],
              },
            ],
            count: "all",
          },
          to: "deckBottom",
          trackCount: "returnedByEffect",
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
            },
            orFilters: [
              {
                controller: "opponent",
                kind: ["Digimon"],
                dp: {
                  op: "lte",
                  value: 8000,
                },
              },
            ],
            count: 1,
          },
          condition: {
            kind: "namedCountAtLeast",
            countSource: "returnedByEffect",
            count: 7,
            raw: "7 or more cards were returned using this effect",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-015", compiled);
