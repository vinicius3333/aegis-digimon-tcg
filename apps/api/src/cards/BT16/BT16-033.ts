// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "Armor Purge", raw: "<Armor Purge>" }],
    },
    {
      trigger: "OnSecurityCheck",
      turnCondition: "yourTurn",
      condition: { kind: "triggerAttackerIsSelf" },
      actions: [
        { kind: "GainMemory", amount: 1, condition: { kind: "securityAtLeast", value: 3 } },
        { kind: "Recover", amount: 1, condition: { kind: "securityAtMost", value: 2 } },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ namesExact: ["Hawkmon"], cost: 2, isAlternate: true }],
};

registerIrCard("BT16-033", compiled);
