import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
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
          effectTextPart: "[On Play] [When Digivolving] You may hatch in your breeding area.",
          kind: "Hatch",
          optional: true,
        },
        {
          effectTextPart:
            "Then, 1 of your Digimon with [Avian] or [Bird] in any of its traits in the breeding area may digivolve into a level 5 or lower Digimon card with [Avian] or [Bird] in any of its traits in the hand without paying the cost.",
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "breeding",
              nameOrTrait: [
                {
                  tokens: ["Avian", "Bird"],
                  match: "traitContains",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Avian", "Bird"],
                match: "traitContains",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] You may hatch in your breeding area.",
          kind: "Hatch",
          optional: true,
        },
        {
          effectTextPart:
            "Then, 1 of your Digimon with [Avian] or [Bird] in any of its traits in the breeding area may digivolve into a level 5 or lower Digimon card with [Avian] or [Bird] in any of its traits in the hand without paying the cost.",
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              zone: "breeding",
              nameOrTrait: [
                {
                  tokens: ["Avian", "Bird"],
                  match: "traitContains",
                },
              ],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "lte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Avian", "Bird"],
                match: "traitContains",
              },
            ],
          },
          payCost: false,
          from: ["hand"],
          optional: true,
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenDeletesInBattle",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Unsuspend",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
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
};

registerIrCard("BT24-048", compiled);
