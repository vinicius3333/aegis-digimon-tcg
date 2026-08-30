// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT23-030 Etemon
// Text: [Main] [Once Per Turn] By paying 1 cost, you may play 1 play cost 3 or lower
// card with [Chuumon] or [Sukamon] in its name or the [CS] trait from your hand
// without paying the cost. Then, 1 of your level 3 or higher Digimon gains
// <Reboot> and <Blocker> until your opponent's turn ends.
//
// KB Q5273/Q5274: Once this optional "by" condition is accepted, the "then" part
// cannot be processed without paying 1 cost first.
//
// Fix: GainKeyword actions must NOT be optional — they are mandatory once cost is paid.
// PlayWithoutCost is optional (player may decline whole effect) with abortOnDecline.
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
          optional: true,
          abortOnDecline: true,
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
