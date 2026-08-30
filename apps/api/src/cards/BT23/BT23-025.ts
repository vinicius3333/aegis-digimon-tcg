// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      isFromHand: true,
      condition: {
        kind: "youHave",
        filter: {
          controllerDefault: "mine",
          kind: ["Digimon", "Tamer"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
        raw: "you have a Digimon or Tamer with the [CS] trait",
      },
      actions: [
        {
          kind: "CostGatedBlock",
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Digimon", "Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
            raw: "you have a Digimon or Tamer with the [CS] trait",
          },
          cost: { kind: "payMemory", memory: 5, raw: "by paying 5 cost" },
          optional: true,
          abortOnDecline: true,
          actions: [
            {
              kind: "GainKeyword",
              target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 3 },
              keyword: { keyword: "SecurityAttack", amount: -1, raw: "＜Security Attack -1＞" },
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              toTop: true,
            },
          ],
        },
      ],
    },
    ...(["OnPlay", "WhenDigivolving"] as const).map((trigger) => ({
      trigger,
      actions: [
        {
          kind: "Return",
          target: { filter: { controller: "opponent", kind: ["Digimon"], superlative: "lowestLevel" }, count: 1 },
          to: "hand",
        },
      ],
    })),
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
        { kind: "DelayedDeletePlayed" },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }],
};

registerIrCard("BT23-025", compiled);
export { compiled };
