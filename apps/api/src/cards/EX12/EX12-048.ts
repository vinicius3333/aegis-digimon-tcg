// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-fixed IR for EX12-048 SeitenGokuumon.
// The scaled DP reduction reuses the opponent target selected by the preceding -8000 action.
export const compiled: CompiledCard = {
  effects: [
    { trigger: "Static", actions: [], keywords: [{ keyword: "Rush", raw: "＜Rush＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Raid", raw: "＜Raid＞" }] },
    { trigger: "Static", actions: [], keywords: [{ keyword: "Piercing", raw: "＜Piercing＞" }] },
    {
      trigger: "Static",
      actions: [],
      keywords: [{ keyword: "SecurityAttack", amount: 1, raw: "＜Security Attack +1＞" }],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -8000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
          scaling: {
            per: 1,
            filter: { levels: [5] },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: -8000,
          duration: "untilOpponentTurnEnd",
        },
        {
          kind: "ModifyDP",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1, sameTarget: true },
          amount: -3000,
          duration: "untilOpponentTurnEnd",
          scaling: {
            per: 1,
            filter: { levels: [5] },
            unit: "digivolutionCards",
          },
        },
        {
          kind: "Attack",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  levels: [5],
                  nameOrTrait: [
                    { tokens: ["Gokuumon"], match: "text" },
                    { tokens: ["SW"], match: "trait" },
                  ],
                },
                count: 2,
                upTo: true,
              },
              from: ["digivolutionCards"],
              fromOwnDigivolutionStack: true,
              payCost: false,
              optional: true,
            },
          ],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    { level: 5, texts: ["Gokuumon"], cost: 3, isAlternate: true },
    { level: 5, traits: ["Shambala"], cost: 3, isAlternate: true },
  ],
  assemblyRequirement: [
    {
      materials: [
        {
          count: 3,
          names: ["Gokuumon", "Sangomon", "Cho-Hakkaimon", "Sanzomon"],
          differentNames: true,
        },
      ],
      reduceCost: 6,
    },
  ],
};

registerIrCard("EX12-048", compiled);
