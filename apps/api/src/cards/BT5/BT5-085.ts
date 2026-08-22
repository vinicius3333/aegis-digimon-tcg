// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "deleteOwn",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
              },
              count: 1,
            },
          },
          amount: { kind: "fixed", value: 12 },
        },
      ],
    },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
    {
      trigger: "Static",
      actions: [
        {
          kind: "DisableTimingEffect",
          target: {
            filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "eq", value: 7 } },
            count: "all",
          },
          timings: ["whenDigivolving"],
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT5-085", compiled);
