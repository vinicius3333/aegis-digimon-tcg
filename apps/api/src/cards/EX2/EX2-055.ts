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
            kind: "trashDigivolution",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Mother D-Reaper"], match: "name" }],
              },
              count: 1,
            },
            minimum: 7,
          },
          amount: { kind: "fixed", value: 20 },
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          keyword: { keyword: "Rush", raw: "＜Rush＞" },
          duration: "permanent",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                nameOrTrait: [{ tokens: ["ADR-02 Searcher"], match: "name" }],
              },
              count: 2,
              from: ["trash"],
            },
            raw: "by placing 2 [ADR-02 Searcher]s from your trash under this Digimon in any order as its bottom digivolution cards",
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-055", compiled);
