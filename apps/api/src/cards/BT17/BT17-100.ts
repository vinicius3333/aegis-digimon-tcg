// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    { trigger: "Security", actions: [{ kind: "AddToHandSelf" }] },
    {
      trigger: "Main",
      actions: [
        { kind: "PlayToken", tokens: ["Diaboromon"], count: 1, payCost: false },
        {
          kind: "PlaceUnder",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          underFilter: {
            controller: "mine",
            nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
            excludeNameOrTrait: [{ tokens: ["Doomsday Clock"], match: "name" }],
          },
        },
      ],
    },
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "WinGame",
          winner: "controller",
          condition: {
            kind: "permanentCount",
            seat: "mine",
            op: "gte",
            value: 4,
            filter: { nameOrTrait: [{ tokens: ["Doomsday Clock"], match: "nameExact" }] },
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
                  },
                  count: 1,
                },
                raw: "by deleting 1 of your other [Diaboromon]",
              },
              optional: true,
              abortOnDecline: true,
            },
          ],
        },
      ],
      isInherited: true,
    },
    { trigger: "EndOfOpponentsTurn", actions: [{ kind: "PlaceInBattleAreaSelf" }], isInherited: true },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-100", compiled);
