// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          actions: [
            {
              kind: "Replacement",
              event: "wouldDigivolve",
              mode: "reduceCost",
              amount: 1,
              cost: {
                kind: "suspend",
                target: { filter: { kind: ["Tamer"] }, count: 5, upTo: true },
                raw: "By suspending up to 5 Tamers",
              },
              raw: "for each Tamer suspended by this effect, reduce the digivolution cost by 1",
            },
          ],
          raw: "When digivolving into this card, by suspending up to 5 Tamers, for each Tamer suspended by this effect, reduce the digivolution cost by 1.",
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
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Argomon"],
      cost: 4,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT17-048", compiled);
