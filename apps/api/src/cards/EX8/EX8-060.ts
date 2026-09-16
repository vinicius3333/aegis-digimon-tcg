import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Unsuspend",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          cost: {
            kind: "deleteOwn",
            target: { filter: { controller: "mine", excludeSelf: true, kind: ["Digimon"] }, count: 1 },
            raw: "By deleting 1 of your other Digimon",
          },
          optional: true,
          abortOnDecline: true,
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
              bindResultAs: "dnaDigivolvedByThisEffect",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: {
                  nameOrTrait: [{ tokens: ["NSo"], match: "trait" }],
                },
                raw: "any of them have the [NSo] trait",
              },
            },
            {
              effectTextPart: "Then, that DNA digivolved Digimon may attack.",
              kind: "Attack",
              target: {
                filter: {
                  boundRef: "dnaDigivolvedByThisEffect",
                },
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
              condition: {
                kind: "bindingExists",
                ref: "dnaDigivolvedByThisEffect",
                raw: "that DNA digivolved Digimon",
              },
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
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
              bindResultAs: "dnaDigivolvedByThisEffect",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: {
                  nameOrTrait: [{ tokens: ["NSo"], match: "trait" }],
                },
                raw: "any of them have the [NSo] trait",
              },
            },
            {
              effectTextPart: "Then, that DNA digivolved Digimon may attack.",
              kind: "Attack",
              target: {
                filter: {
                  boundRef: "dnaDigivolvedByThisEffect",
                },
                count: 1,
              },
              withoutSuspending: false,
              optional: true,
              condition: {
                kind: "bindingExists",
                ref: "dnaDigivolvedByThisEffect",
                raw: "that DNA digivolved Digimon",
              },
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
