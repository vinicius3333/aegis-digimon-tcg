// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Yellow"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          bindResultAs: "playedByThisEffect",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
              },
              count: 1,
              position: "top",
            },
            raw: "By trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              boundRef: "playedByThisEffect",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              colors: ["Yellow"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          from: ["hand"],
          payCost: false,
          bindResultAs: "playedByThisEffect",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "security",
              },
              count: 1,
              position: "top",
            },
            raw: "By trashing the top card of your security stack",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              boundRef: "playedByThisEffect",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: {
            keyword: "Rush",
            raw: "＜Rush＞",
          },
          duration: "forTheTurn",
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Aura",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              colors: ["Yellow"],
            },
            count: "all",
          },
          effect: {
            kind: "keyword",
            keyword: {
              keyword: "Barrier",
              raw: "＜Barrier＞",
            },
          },
        },
      ],
    },
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "gte",
                value: {
                  kind: "dynamicCount",
                  filter: {
                    zone: "security",
                    controller: "any",
                  },
                  unit: "cards",
                },
              },
            },
            count: "all",
            whileMatchesTargetFilter: true,
          },
          keyword: {
            keyword: "SecurityAttack",
            amount: -2,
            raw: "＜Security Attack -2＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX5-033", compiled);
