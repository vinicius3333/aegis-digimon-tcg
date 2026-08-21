// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q3941-Q3944: [Your Turn] fires when this card itself is played or digivolved into.
// DNA digivolve triggers, then that DNA'd Digimon may attack (not a new attack declaration
// during an existing attack — KB Q3943). [When Attacking] + [When Digivolving] trigger
// simultaneously when DNA'd Digimon attacks (KB Q3944).
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
            raw: "By deleting 1 of your other Digimon",
          },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
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
              playCostLte: 3,
              nameOrTrait: [
                {
                  tokens: ["NSo"],
                  match: "trait",
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
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["NSo"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 2,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["NSo"],
                    match: "trait",
                  },
                ],
              },
              payCost: true,
              optional: true,
            },
            {
              kind: "Attack",
              target: {
                filter: {
                  dnaDigivolvedByThisEffect: true,
                },
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["NSo"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "DnaDigivolve",
              materials: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 2,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["NSo"],
                    match: "trait",
                  },
                ],
              },
              payCost: true,
              optional: true,
            },
            {
              kind: "Attack",
              target: {
                filter: {
                  dnaDigivolvedByThisEffect: true,
                },
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["NSo"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX8-060", compiled);
