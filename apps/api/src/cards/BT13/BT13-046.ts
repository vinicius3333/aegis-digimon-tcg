// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const securityCondition = { kind: "totalSecurityCount", op: "lte", value: 6 } as const;

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        { kind: "GainMemory", amount: 3, condition: securityCondition },
        {
          kind: "HandRevealAdd",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
          securityFilter: { colors: ["Yellow"] },
          toTop: true,
          condition: securityCondition,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        { kind: "GainMemory", amount: 3, condition: securityCondition },
        {
          kind: "HandRevealAdd",
          target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
          securityFilter: { colors: ["Yellow"] },
          toTop: true,
          condition: securityCondition,
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
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -7000,
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT13-046", compiled);
