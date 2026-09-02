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
