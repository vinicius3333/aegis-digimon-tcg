import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: {
            isSelfRef: true,
          },
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
              keyword: {
                keyword: "SecurityAttack",
                amount: -1,
                raw: "＜Security Attack -1＞",
              },
              duration: "untilOpponentTurnEnd",
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDiscardSecurity",
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
          keyword: {
            keyword: "SecurityAttack",
            amount: -1,
            raw: "＜Security Attack -1＞",
          },
          duration: "untilOpponentTurnEnd",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 2 },
            {
              kind: "ModifyDP",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "CostGatedBlock",
          cost: {
            kind: "trash",
            target: { filter: { controller: "mine", zone: "security", position: "top" }, count: 1 },
            raw: "By trashing your top security card",
          },
          optional: true,
          abortOnDecline: true,
          actions: [
            { kind: "TrashTopDeck", controller: "mine", amount: 2 },
            {
              kind: "ModifyDP",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: "all",
              },
              amount: -3000,
              duration: "forTheTurn",
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Barrier",
          raw: "＜Barrier＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      traits: ["Evil"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX10-041", compiled);

export { compiled };
