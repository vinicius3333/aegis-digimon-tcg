// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "CostModifier",
          mode: "reduce",
          costType: "digivolution",
          amount: { kind: "perSuspendedTamer", max: 5 },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "Restrict",
          target: { filter: { controller: "opponent", kind: ["Tamer"] }, count: "all" },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: { controller: "mine", levels: [6], nameOrTrait: [{ tokens: ["Argomon"], match: "name" }] },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          condition: {
            kind: "youHave",
            filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Argomon"], match: "name" }] },
            count: 4,
            raw: "you have 4 or more [Argomon] in your trash",
          },
          optional: true,
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
            kind: "suspend",
            target: { filter: { controller: "mine", nameOrTrait: [{ tokens: ["Rhythm"], match: "name" }] }, count: 1 },
            raw: "By suspending 1 of your [Rhythm]",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-048", compiled);
