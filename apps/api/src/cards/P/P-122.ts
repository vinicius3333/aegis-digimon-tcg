// @ts-nocheck
// Hand-fixed IR for P-122 — look at security, add yellow/black multicolor card, conditional Recovery.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Search",
          controller: "mine",
          filter: {
            controller: "mine",
            zone: "security",
            colors: ["Yellow", "Black"],
            multicolor: true,
          },
          count: 1,
          from: ["security"],
          to: "hand",
          optional: true,
          look: true,
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectActed",
            raw: "if you added cards",
          },
        },
        {
          kind: "SecurityManipulation",
          op: "shuffle",
          controller: "mine",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifySecurityDP",
          controller: "opponent",
          amount: -2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};
registerIrCard("P-122", compiled);
