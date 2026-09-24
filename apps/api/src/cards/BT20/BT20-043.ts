import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 5,
              raw: "reduce the play cost by 5",
              condition: {
                kind: "youHave",
                filter: {
                  controllerDefault: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["ACCEL"],
                      match: "trait",
                    },
                  ],
                },
                raw: "you have a Digimon with the [ACCEL] trait",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Suspend all of your opponent's Digimon and 1 of your Digimon gets +3000 DP for the turn.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Suspend all of your opponent's Digimon and 1 of your Digimon gets +3000 DP for the turn.",
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, 1 of your Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] Suspend all of your opponent's Digimon and 1 of your Digimon gets +3000 DP for the turn.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
          },
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] Suspend all of your opponent's Digimon and 1 of your Digimon gets +3000 DP for the turn.",
          kind: "ModifyDP",
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          amount: 3000,
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, 1 of your Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
        },
      ],
    },
    {
      trigger: "EndOfYourTurn",
      actions: [
        {
          effectTextPart:
            "[End of Your Turn] This Digimon and any of your other Digimon may DNA digivolve into a Digimon card with [Chaosmon] in its name in the hand.",
          kind: "DnaDigivolve",
          materials: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 2,
            includeRef: "self",
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Chaosmon"],
                match: "name",
              },
            ],
          },
          payCost: true,
          optional: true,
          bindResultAs: "dnaDigivolvedByThisEffect",
        },
        {
          effectTextPart: "Then, the DNA digivolved Digimon may attack.",
          kind: "Attack",
          drainTimingWindowDuringAttack: true,
          target: {
            filter: {
              boundRef: "dnaDigivolvedByThisEffect",
            },
            count: 1,
          },
          withoutSuspending: false,
          optional: true,
          condition: { kind: "bindingExists", ref: "dnaDigivolvedByThisEffect" },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -4000,
          duration: "forTheTurn",
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
      level: 5,
      traits: ["ACCEL"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT20-043", compiled);
