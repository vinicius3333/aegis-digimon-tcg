import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "lte",
            value: 5,
            raw: "your opponent has 5 or fewer cards in their hand",
          },
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
          },
          controller: "opponent",
          chooser: "opponent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 7,
            raw: "they have 7 or more cards in their hand",
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "GainMemory",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "lte",
            value: 5,
            raw: "your opponent has 5 or fewer cards in their hand",
          },
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
          },
          controller: "opponent",
          chooser: "opponent",
          condition: {
            kind: "zoneCount",
            seat: "opponent",
            zone: "hand",
            op: "gte",
            value: 7,
            raw: "they have 7 or more cards in their hand",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[When Attacking] [Once Per Turn] Your opponent may trash 1 card in their hand.",
          kind: "Trash",
          target: {
            filter: {
              controller: "opponent",
              zone: "hand",
            },
            count: 1,
          },
          optional: true,
          controller: "opponent",
          chooser: "opponent",
        },
        {
          effectTextPart:
            "If they don't, you may play 1 level 3 purple Digimon card from your trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Purple"],
              levels: [3],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          condition: {
            kind: "ifThisEffectDidNotAct",
            raw: "they don't",
          },
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX6-050", compiled);
