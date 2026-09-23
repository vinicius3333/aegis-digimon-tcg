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
          labels: [
            "Play 1 [Rosemon] from your hand without paying the cost",
            "Play up to 2 yellow level 3 Digimon from your hand without paying the cost",
          ],
          optional: true,
          options: [
            [
              {
                kind: "PlayWithoutCost",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Rosemon"], match: "nameExact" }],
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
