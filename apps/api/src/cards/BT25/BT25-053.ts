import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Vortex",
          raw: "＜Vortex＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "instead",
          sourceFilter: { isSelfRef: true },
          leaveCause: "otherThanBattle",
          raw: "＜Decode ([Aegiomon])＞: when this Digimon would leave other than in battle, you may play 1 [Aegiomon] from its digivolution cards without paying the cost.",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  zone: "digivolutionCards",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Aegiomon"], match: "name" }],
                },
                count: 1,
              },
              fromOwnDigivolutionStack: true,
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
          keyword: "Decode",
          raw: "＜Decode ([Aegiomon])＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
            bindAs: "onPlayTarget",
          },
        },
        {
          kind: "Suspend",
          target: {
            fromSelectionRef: "onPlayTarget",
            filter: {},
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "onPlayTarget",
            filter: {},
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 5000,
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SelectBind",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon", "Tamer"],
            },
            count: 1,
            bindAs: "whenDigivolvingTarget",
          },
        },
        {
          kind: "Suspend",
          target: {
            fromSelectionRef: "whenDigivolvingTarget",
            filter: {},
            count: 1,
          },
        },
        {
          kind: "Restrict",
          target: {
            fromSelectionRef: "whenDigivolvingTarget",
            filter: {},
            count: 1,
          },
          restriction: "unsuspend",
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "GainKeyword",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 5000,
          duration: "forTheTurn",
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 3,
            raw: "you have 3 or fewer security cards",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon", "Tamer"],
                },
                count: 1,
              },
              optional: true,
            },
          ],
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
      names: ["Aegiomon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT25-053", compiled);
