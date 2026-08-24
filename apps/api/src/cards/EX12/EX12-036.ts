// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levelComparison: { op: "lte", value: 5 },
                  nameOrTrait: [
                    { tokens: ["Aqua", "Sea Animal"], match: "traitContains" },
                    { tokens: ["TB"], match: "trait" },
                  ],
                },
                count: 1,
              },
              from: ["digivolutionCards"],
              payCost: false,
              playedByDecode: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Evade",
          raw: "＜Evade＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.5 or lower w/[Aqua]/[Sea Animal] in any trait or w/[TB] trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                  {
                    tokens: ["TB"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 6 or lower card with [Aqua] or [Sea Animal] in any of its traits or with the [TB] trait from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                  {
                    tokens: ["TB"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 6 or lower card with [Aqua] or [Sea Animal] in any of its traits or with the [TB] trait from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          optional: true,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 6,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "traitContains",
                  },
                  {
                    tokens: ["TB"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 level 6 or lower card with [Aqua] or [Sea Animal] in any of its traits or with the [TB] trait from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          abortOnDecline: true,
        },
      ],
      frequency: "OncePerTurn",
      sharedUseKey: "ir-shared-0",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                sameTarget: true,
              },
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              restriction: "suspend",
              duration: "untilOpponentTurnEnd",
            },
            {
              kind: "Restrict",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
                sameTarget: true,
              },
              restriction: "cannotActivateWhenDigivolving",
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Aquatic", "Shambala"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX12-036", compiled);
