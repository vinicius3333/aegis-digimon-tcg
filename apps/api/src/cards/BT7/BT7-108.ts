import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          scaling: {
            per: 1,
            unit: "cards",
            filter: {
              controller: "mine",
              zone: "battleArea",
              or: [
                {
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Hybrid"],
                      match: "trait",
                    },
                  ],
                },
                {
                  kind: ["Tamer"],
                },
              ],
            },
          },
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "ActivateMain",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-108", compiled);
