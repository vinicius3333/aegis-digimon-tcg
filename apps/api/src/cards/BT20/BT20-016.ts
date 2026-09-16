import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart:
            "[On Play] [When Digivolving] For the turn, 1 of your Digimon gains ＜Piercing＞ and gets +4000 DP.",
          kind: "GainKeyword",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
            bindAs: "paildramonBoostTarget",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] For the turn, 1 of your Digimon gains ＜Piercing＞ and gets +4000 DP.",
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "paildramonBoostTarget" },
          amount: 4000,
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, this Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
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
            "[On Play] [When Digivolving] For the turn, 1 of your Digimon gains ＜Piercing＞ and gets +4000 DP.",
          kind: "GainKeyword",
          target: {
            filter: { controller: "mine", kind: ["Digimon"] },
            count: 1,
            bindAs: "paildramonBoostTarget",
          },
          keyword: {
            keyword: "Piercing",
            raw: "＜Piercing＞",
          },
          duration: "forTheTurn",
        },
        {
          effectTextPart:
            "[On Play] [When Digivolving] For the turn, 1 of your Digimon gains ＜Piercing＞ and gets +4000 DP.",
          kind: "ModifyDP",
          target: { filter: {}, count: 1, fromSelectionRef: "paildramonBoostTarget" },
          amount: 4000,
          duration: "forTheTurn",
        },
        {
          effectTextPart: "Then, this Digimon may attack.",
          kind: "Attack",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
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
          event: "wouldBeDeleted",
          sourceFilter: {
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Paildramon", "Dinobeemon"],
                match: "nameExact",
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
                zone: "hand",
                nameOrTrait: [
                  {
                    tokens: ["Imperialdramon: Dragon Mode"],
                    match: "nameExact",
                  },
                ],
              },
              payCost: true,
              optional: true,
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
          keyword: "SecurityAttack",
          amount: 1,
          raw: "＜Security Attack +1＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT20-016", compiled);
