// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4754: [Your Turn] does NOT fire when this card itself digivolves into a [Garurumon].
// Two SubTriggers: (1) whenPlayed for Digimon/Tamers with [Garurumon] or [Tai Kamiya];
// (2) whenOneOfYoursDigivolves into [Garurumon] Digimon.
export const compiled: CompiledCard = {
  effects: [
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
                value: 8000,
              },
            },
            count: 1,
          },
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
                value: 8000,
              },
            },
            count: 1,
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon", "Tamer"],
            nameOrTrait: [
              {
                tokens: ["Garurumon"],
                match: "name",
              },
              {
                tokens: ["Tai Kamiya"],
                match: "name",
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Greymon"],
                    match: "name",
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
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          digivolveIntoFilter: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Garurumon"],
                match: "name",
              },
            ],
            excludeSelf: true,
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Greymon"],
                    match: "name",
                  },
                ],
              },
              payCost: false,
              from: ["hand"],
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "YourTurn",
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
          amount: 4000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["MetalGreymon"],
      cost: 1,
      isAlternate: true,
    },
    {
      level: 4,
      names: ["Greymon"],
      cost: 3,
      isAlternate: true,
    },
    {
      traits: ["ADVENTURE"],
      cost: 3,
      isAlternate: true,
      level: 4,
    },
  ],
};

registerIrCard("EX9-012", compiled);
