import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 5,
          add: [
            {
              filter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                colors: ["Yellow"],
                nameOrTrait: [
                  {
                    tokens: ["Warrior"],
                    match: "trait",
                  },
                  {
                    tokens: ["Holy Warrior"],
                    match: "trait",
                  },
                ],
              },
              count: 2,
              to: "hand",
              optional: true,
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

registerIrCard("BT5-034", compiled);
