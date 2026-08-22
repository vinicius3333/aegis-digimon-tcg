// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Decoy", raw: "＜Decoy ([Bagra Army])＞" }] },
    {
      trigger: "AllTurns",
      actions: [{
        kind: "Restrict",
        target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Yuu Amano"], match: "name" }] }, count: "all" },
        restriction: "beDeleted",
        duration: "permanent",
      }],
    },
    {
      trigger: "OnDeletion",
      actions: [{
        kind: "PlayWithoutCost",
        target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Damemon"], match: "name" }] }, count: 1 },
        from: ["trash"],
        payCost: false,
        optional: true,
      }],
    },
    {
      trigger: "OpponentsTurn",
      actions: [{
        kind: "SubTrigger",
        event: "onDigivolutionCardDiscarded",
        sourceFilter: { isSelfRef: true },
        actions: [{ kind: "GainMemory", amount: 1 }],
      }],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT11-082", compiled);
