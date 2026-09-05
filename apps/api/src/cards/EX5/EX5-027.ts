// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          searchZone: "security",
          filter: { controller: "mine", nameOrTrait: [{ tokens: ["Leomon"], match: "name" }] },
          count: 1,
          to: "hand",
          optional: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: { kind: "ifThisEffectActed" },
        },
        { kind: "SecurityManipulation", op: "shuffle", controller: "mine" },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -2000,
          duration: "untilOpponentTurnEnd",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-027", compiled);
