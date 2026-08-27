// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                kind: ["Digimon"],
                or: [
                  { colors: ["Blue"], levels: [3] },
                  { nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "trait" }] },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 qualifying Digimon from your hand under this Digimon",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-024", compiled);
