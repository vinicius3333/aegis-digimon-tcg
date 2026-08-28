// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// EX12-016 MetalGreymon
// [Digivolve] Lv.4 w/[Greymon] in name or w/[ME]/[VB] trait: Cost 3
// The two digivolutionRequirement entries (names/traits) are the correct OR-split encoding.
// <Security Attack +1>
// <Decode (Lv.4 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)>
// [On Play][When Digivolving] Delete 1 of your opponent's Digimon with 6000 DP or less.
//   Then, give 1 of their Digimon "[Start of Your Main Phase] This Digimon attacks."
//   until their turn ends.
// [Inherited] <Decode (Lv.4 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)>
//
// The grant uses the same proven startOfYourMainPhase SubTrigger shape as BT23-056 and
// BT12-065. Unlike BT23-056, this card has NO precondition gating the grant — it is
// unconditional. The chosen opponent Digimon gains "[Start of Your Main Phase] This Digimon
// attacks." until their turn ends (untilOpponentTurnEnd).
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
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
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [
                    { tokens: ["Agumon", "Greymon"], match: "name" },
                    { tokens: ["ME", "VB"], match: "trait" },
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
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "SubTrigger",
          event: "startOfYourMainPhase",
          on: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          duration: "untilOpponentTurnEnd",
          actions: [
            {
              kind: "Attack",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "give 1 of their Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "SubTrigger",
          event: "startOfYourMainPhase",
          on: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          duration: "untilOpponentTurnEnd",
          actions: [
            {
              kind: "Attack",
              target: {
                filter: { isSelfRef: true },
                count: 1,
                isSelf: true,
              },
            },
          ],
          raw: "give 1 of their Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Decode",
          raw: "＜Decode (Lv.4 or lower w/[Agumon]/[Greymon] in name or w/[ME]/[VB] trait)＞",
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
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [
                    { tokens: ["Agumon", "Greymon"], match: "name" },
                    { tokens: ["ME", "VB"], match: "trait" },
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
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["ME", "VB"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 1,
          nameOrTrait: [
            {
              tokens: ["Agumon", "Greymon"],
              match: "name",
            },
            {
              tokens: ["ME", "VB"],
              match: "trait",
            },
          ],
          levelMax: 4,
        },
      ],
      reduceCost: 2,
    },
  ],
};

registerIrCard("EX12-016", compiled);
