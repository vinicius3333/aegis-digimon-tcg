// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const royalKnight = {
  controllerDefault: "mine",
  kind: ["Digimon"],
  nameOrTrait: [{ tokens: ["Royal Knight"], match: "trait" }],
};
const royalKnightOnYourTurn = {
  kind: "allOf",
  conditions: [{ kind: "isYourTurn" }, { kind: "triggerSubjectMatchesFilter", filter: royalKnight }],
};
const paidDrawAndMemory = [
  {
    kind: "Draw" as const,
    controller: "mine" as const,
    amount: 1,
    condition: royalKnightOnYourTurn,
    cost: {
      kind: "suspend" as const,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      raw: "by suspending this Tamer",
    },
    abortOnDecline: true,
  },
  { kind: "GainMemory" as const, amount: 1, condition: { kind: "ifThisEffectActed" as const } },
];

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          actions: paidDrawAndMemory,
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: paidDrawAndMemory,
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: royalKnight,
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Omekamon"], match: "name" }],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Security",
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          from: ["security"],
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-091", compiled);
