import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-030 Etemon
// Text: [Main] [Once Per Turn] By paying 1 cost, you may play 1 play cost 3 or lower
// card with [Chuumon] or [Sukamon] in its name or the [CS] trait from your hand
// without paying the cost. Then, 1 of your level 3 or higher Digimon gains
// <Reboot> and <Blocker> until your opponent's turn ends.
//
// KB Q5273: the "by paying 1 cost" condition CANNOT be declined once activation of this
// [Main] effect is declared (CR 15-8-4-4-1), so the CostGatedBlock is mandatory; affordability
// alone gates whether the effect may be activated at all.
// KB Q5274: the "then" tail cannot be processed without that payment, which the block
// guarantees by wrapping both halves.
// Only the printed "you may play" is optional; the keyword tail is mandatory on one target.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
    {
      trigger: "Main",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "payMemory",
            memory: 1,
            raw: "By paying 1 cost",
          },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  playCostLte: 3,
                  nameOrTrait: [
                    { tokens: ["Chuumon", "Sukamon"], match: "name" },
                    { tokens: ["CS"], match: "trait" },
                  ],
                },
                count: 1,
                upTo: true,
              },
              from: ["hand"],
              payCost: false,
              optional: true,
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "gte", value: 3 },
                },
                count: 1,
              },
              keyword: { keyword: "Reboot", raw: "＜Reboot＞" },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "gte", value: 3 },
                },
                count: 1,
                sameTarget: true,
              },
              keyword: { keyword: "Blocker", raw: "＜Blocker＞" },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [{ keyword: "Alliance", raw: "＜Alliance＞" }],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Sukamon"],
      cost: 3,
      isAlternate: true,
    },
    {
      level: 4,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-030", compiled);
