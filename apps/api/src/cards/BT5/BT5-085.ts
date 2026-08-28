// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [
        {
          kind: "ReducePlayCost",
          payment: {
            kind: "sacrificePermanent",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Diaboromon"], match: "nameExact" }],
              },
              count: 1,
            },
          },
          amount: { kind: "fixed", value: 12 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Rush", raw: "＜Rush＞" }],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "Restrict",
          target: {
            filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "eq", value: 7 } },
            count: "all",
          },
          restriction: "cannotActivateWhenDigivolving",
          duration: "permanent",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("BT5-085", compiled);
