// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const suspendToDraw = {
  condition: {
    kind: "zoneCount",
    seat: "mine",
    zone: "hand",
    op: "lte",
    value: 7,
    raw: "you have 7 or fewer cards in your hand",
  },
  cost: {
    kind: "suspend",
    target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
    raw: "by suspending this Tamer",
  },
  optional: true,
  abortOnDecline: true,
  actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
};

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttacking",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [{ tokens: ["Jellymon"], match: "text" }],
          },
          raw: "when one of your Digimon with [Jellymon] in its text attacks",
          ...suspendToDraw,
        },
      ],
    },
    {
      trigger: "Static",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOpponentAttacks",
          sourceFilter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
          raw: "when an opponent's level 5 or higher Digimon attacks",
          ...suspendToDraw,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenUnsuspended",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
          raw: "when this Tamer becomes unsuspended",
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
          payCost: false,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("RB1-033", compiled);
