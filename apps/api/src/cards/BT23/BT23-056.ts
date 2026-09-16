import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
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
            keyword: "Blocker",
          },
          duration: "permanent",
        },
      ],
      keywords: [],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SubTrigger",
          event: "startOfYourMainPhase",
          condition: {
            kind: "youHave",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
          },
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
          raw: "give 1 of your opponent's Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SubTrigger",
          event: "startOfYourMainPhase",
          condition: {
            kind: "youHave",
            filter: {
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
            },
          },
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
          raw: "give 1 of your opponent's Digimon '[Start of Your Main Phase] This Digimon attacks.' until their turn ends",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAttackTargetSwitched",
          actions: [
            {
              kind: "DeDigivolve",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              amount: 1,
            },
          ],
          raw: "When attack targets change, ＜De-Digivolve 1＞ 1 of your opponent's Digimon",
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
      traits: ["CS"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT23-056", compiled);
