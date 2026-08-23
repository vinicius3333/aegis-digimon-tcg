import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "trash",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["D-Brigade"], match: "trait" }],
            },
            count: 5,
            upTo: true,
          },
          order: "any",
          trackCount: "returnedDBrigade",
          to: "deckTop",
        },
        { kind: "GainMemory", amount: 2, scaling: { per: 1, unit: "namedCount", countSource: "returnedDBrigade" } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT4-074", compiled);
