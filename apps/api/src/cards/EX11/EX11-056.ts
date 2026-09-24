import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourTurn",
      actions: [
        {
          kind: "SetMemory",
          value: 3,
          condition: {
            kind: "memoryAtMost",
            value: 2,
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          effectTextPart:
            "[All Turns] When any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or the [Dinosaur] trait, by suspending this Tamer, you may hatch in your breeding area.",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
          },
          digivolveIntoFilter: {
            levelComparison: {
              op: "gte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Tyrannomon"],
                match: "name",
              },
              {
                tokens: ["Dinosaur"],
                match: "trait",
                orPrevious: true,
              },
            ],
          },
          cost: {
            kind: "suspend",
            target: {
              filter: {
                isSelfRef: true,
              },
              count: 1,
              isSelf: true,
            },
            raw: "by suspending this Tamer",
          },
          actions: [
            {
              effectTextPart:
                "[All Turns] When any of your Digimon digivolve into a level 5 or higher Digimon with [Tyrannomon] in its name or the [Dinosaur] trait, by suspending this Tamer, you may hatch in your breeding area.",
              kind: "Hatch",
              optional: true,
            },
            {
              kind: "Digivolve",
              effectTextPart:
                "After, 1 of your Digimon in the breeding area may digivolve into a Digimon card with [Tyrannomon] in its name or the [Reptile] or [Dinosaur] trait in the hand without paying the cost.",
              target: {
                filter: {
                  controller: "mine",
                  zone: "breeding",
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Tyrannomon"],
                    match: "name",
                  },
                  {
                    tokens: ["Reptile", "Dinosaur"],
                    match: "trait",
                    orPrevious: true,
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
      trigger: "Security",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          payCost: false,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX11-056", compiled);
