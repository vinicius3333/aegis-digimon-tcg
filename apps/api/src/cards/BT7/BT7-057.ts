import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                nameOrTrait: [
                  {
                    tokens: ["Knightmon"],
                    match: "name",
                  },
                ],
              },
              orFilters: [
                {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["DeadlyAxemon"],
                      match: "nameExact",
                    },
                  ],
                },
              ],
              count: 1,
              to: "hand",
            },
          ],
          rest: "deckBottom",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-057", compiled);
