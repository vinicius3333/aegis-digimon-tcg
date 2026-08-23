// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Modal",
          choose: 1,
          optional: true,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Rosemon"], match: "name" }],
                  },
                  count: 1,
                },
                from: ["hand"],
                payCost: false,
              },
            ],
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    colors: ["Yellow"],
                    levels: [3],
                  },
                  count: 2,
                  upTo: true,
                },
                from: ["hand"],
                payCost: false,
              },
            ],
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT6-042", compiled);
