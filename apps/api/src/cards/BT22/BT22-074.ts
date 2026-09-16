import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "payMemory",
            memory: 3,
            raw: "By paying 3 cost",
          },
          actions: [
            {
              effectTextPart:
                "[Main] [Once Per Turn] By paying 3 cost, delete 1 of your opponent's level 5 or lower Digimon. If this effect didn't delete, this Digimon gains ＜Security A. +1＞ for the turn.",
              kind: "Delete",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                },
                count: 1,
              },
            },
            {
              effectTextPart:
                "[Main] [Once Per Turn] By paying 3 cost, delete 1 of your opponent's level 5 or lower Digimon. If this effect didn't delete, this Digimon gains ＜Security A. +1＞ for the turn.",
              kind: "GainKeyword",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              keyword: { keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" },
              duration: "forTheTurn",
              condition: { kind: "ifThisEffectDidNotDelete", raw: "if this effect didn't delete" },
            },
            {
              effectTextPart: "Then, this Digimon may attack.",
              kind: "Attack",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "Trash",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
              nameOrTrait: [
                {
                  tokens: ["Flame", "CS"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 4, colors: ["Purple"], cost: 4, isAlternate: false },
    { level: 4, colors: ["Red"], cost: 4, isAlternate: false },
    {
      level: 4,
      traits: ["Flame", "CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-074", compiled);
