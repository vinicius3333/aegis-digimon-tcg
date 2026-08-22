// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "BeforePayCost",
      actions: [{
        kind: "ReducePlayCost",
        payment: {
          kind: "sacrificePermanent",
          target: { filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }] }, count: 1 },
        },
        amount: { kind: "fixed", value: 12 },
      }],
    },
    {
      trigger: "Static",
      actions: [{
        kind: "GainKeyword",
        target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
        keyword: { keyword: "Rush", raw: "＜Rush＞" },
        duration: "permanent",
      }],
    },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "Restrict",
        target: { filter: { controller: "any", kind: ["Digimon"], levelComparison: { op: "eq", value: 7 } }, count: "all" },
        restriction: "cannotActivateWhenDigivolving",
        duration: "permanent",
      }],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT5-085", compiled);
