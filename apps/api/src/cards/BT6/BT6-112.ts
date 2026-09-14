import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "play",
          amount: 1,
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          handResident: true,
          duration: "permanent",
          scaling: {
            per: 1,
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Three Musketeers"],
                  match: "trait",
                },
              ],
              orFilters: [{ kind: ["Option"], playCostOneOf: [7] }],
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
          effectTextPart: "[On Play] Return 1 Option card with a memory cost of 7 from your trash to your hand.",
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Option"],
              playCostOneOf: [7],
            },
            count: 1,
            upTo: true,
          },
          to: "hand",
        },
        {
          effectTextPart:
            "Then, use 1 Option card with a memory cost of 7 in your hand without paying its memory cost.",
          kind: "UseOptionWithoutCost",
          filter: { kind: ["Option"], playCostOneOf: [7] },
          from: ["hand"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-112", compiled);
