// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play][When Digivolving]: By trashing 1 card with [Gammamon] in its TEXT from hand,
// give 1 opponent's Digimon BOTH <Collision> AND "[Start of Your Main Phase] This Digimon attacks."
// until their turn ends. KB Q4586: "in its text" = contains Gammamon in name, traits, effects, etc.
// KB Q4587: the gained effects work normally unless the Digimon is unaffected by your effects.
//
// [On Deletion]: You may play 1 [Canoweissmon] or 1 level 4-or-lower Digimon card with [Gammamon]
// in its text from trash without paying cost. ("with [Gammamon]" = text match per KB Q4586).
// The bracket-only [Canoweissmon] branch is an exact named-card reference per comprehensive §2-3-1.
// isInherited version has same rule.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: { keyword: "Collision", raw: "＜Collision＞" },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
              },
              count: 1,
            },
            raw: "By trashing 1 card with [Gammamon] in its text from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainTriggeredEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          keyword: { keyword: "Collision", raw: "＜Collision＞" },
          duration: "untilOpponentTurnEnd",
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
              },
              count: 1,
            },
            raw: "By trashing 1 card with [Gammamon] in its text from your hand",
          },
          optional: true,
          abortOnDecline: true,
        },
        {
          kind: "GainTriggeredEffect",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
            sameTarget: true,
          },
          gainedTrigger: "StartOfYourMainPhase",
          gainedActions: [{ kind: "Attack", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } }],
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
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              orFilters: [
                {
                  nameOrTrait: [{ tokens: ["Canoweissmon"], match: "nameExact" }],
                },
                {
                  levelComparison: { op: "lte", value: 4 },
                  nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
                },
              ],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              levelComparison: { op: "lte", value: 4 },
              nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }],
            },
            count: 1,
          },
          from: ["trash"],
          payCost: false,
          optional: true,
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
      texts: ["Gammamon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT21-077", compiled);
