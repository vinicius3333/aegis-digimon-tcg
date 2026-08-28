// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT22-063 Alphamon
// Fix: [All Turns] condition was raw string; replaced with orConditions (selfDigivolutionStackHas +
//   stackHasSameLevelCards). Q4922: unsuspend always happens regardless of condition.
// The Kyoko Kuremi path is available only while the owner has 3 or fewer
// security cards; this is represented by the live whileCondition gate.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Reboot",
          raw: "＜Reboot＞",
        },
      ],
    },
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
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -5000,
          duration: "forTheTurn",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSuspended",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "ModifyDP",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              amount: 3000,
              duration: "untilOpponentTurnEnd",
              condition: {
                kind: "orConditions",
                conditions: [
                  {
                    kind: "selfDigivolutionStackHasTrait",
                    filter: {
                      nameOrTrait: [
                        {
                          tokens: ["Kyoko Kuremi"],
                          match: "name",
                        },
                      ],
                    },
                    raw: "[Kyoko Kuremi] is in this Digimon's digivolution cards",
                  },
                  {
                    kind: "stackHasSameLevelCards",
                    minCount: 2,
                    raw: "this Digimon's stack has 2 or more same-level cards",
                  },
                ],
              },
            },
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "When this Digimon suspends",
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
    {
      names: ["Kyoko Kuremi"],
      cost: 5,
      whileCondition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "security",
        op: "lte",
        value: 3,
        raw: "while you have 3 or fewer security cards",
      },
      isAlternate: true,
    },
  ],
};

registerIrCard("BT22-063", compiled);
