// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for BT19-053 (QueenBeemon).
// Fixes:
// 1. WhenAttacking: PlayWithoutCost has reduceCost:8 embedded (not a separate Replacement
//    action). The payCost:true + Replacement was structurally incorrect — the cost is
//    reduced inline as a modifier on the play action.
// 2. AllTurns Replacement: leaveCause:"otherThanBattle" added to exclude battle deletions
//    (text: "other than in battle", KB Q3108 confirms placement covers all affected
//    Digimon at once so source is matched Digimon, not a separate source).
// 3. AllTurns Replacement: source filter in SecurityManipulation now uses the sourceFilter
//    Digimon (the leaving Royal Base Digimon) not a generic Digimon filter.
// 4. AllTurns Replacement: SecurityManipulation adds faceUp:true (text: "face-up").
// 5. AllTurns: KB Q3108 says all affected Digimon can be placed; count:"all" on source.
const compiled: CompiledCard = {
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
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "security",
              faceUp: true,
              nameOrTrait: [
                {
                  tokens: ["Royal Base"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          from: ["security"],
          payCost: true,
          reduceCostBy: 8,
          optional: true,
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          affectsAll: true,
          leaveCause: "otherThanBattle",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Royal Base"],
                match: "trait",
              },
            ],
          },
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }],
            },
            count: "all",
          },
          actions: [
            {
              kind: "SecurityManipulation",
              op: "placeAsSecurity",
              controller: "mine",
              source: {
                filter: {
                  useTriggerSource: true,
                },
                count: "all",
              },
              toTop: false,
              faceUp: true,
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Insectoid"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      traits: ["Royal Base"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT19-053", compiled);
