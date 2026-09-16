import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          effectTextPart:
            "[Main] 1 of your Digimon may digivolve into a level 5 or higher Digimon card with the [Free] trait in your hand with the digivolution cost reduced by 4.",
          kind: "Digivolve",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
            },
            count: 1,
          },
          into: {
            controllerDefault: "mine",
            kind: ["Digimon"],
            levelComparison: {
              op: "gte",
              value: 5,
            },
            nameOrTrait: [
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
          },
          from: ["hand"],
          payCost: true,
          reduceCost: 4,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          leaveCause: "otherThanYourEffect",
          sourceFilter: {
            zone: "battleArea",
            controller: "mine",
            kind: ["Digimon"],
            nameOrTrait: [
              {
                tokens: ["Free"],
                match: "trait",
              },
            ],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  useTriggerSource: true,
                  zone: "battleArea",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ tokens: ["Free"], match: "trait" }],
                },
                count: 1,
              },
              into: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [
                  {
                    tokens: ["Imperialdramon"],
                    match: "name",
                  },
                ],
              },
              from: ["hand"],
              payCost: false,
              bindResultAs: "digivolvedToPreventDeletion",
            },
            {
              kind: "Prevent",
              condition: {
                kind: "bindingExists",
                ref: "digivolvedToPreventDeletion",
                raw: "digivolved that Digimon into [Imperialdramon]",
              },
            },
          ],
          raw: "wouldBeDeleted",
        },
      ],
      keywords: [
        {
          keyword: "Delay",
          raw: "＜Delay＞",
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          effectTextPart:
            "[Security] You may play 1 Tamer card with [Davis Motomiya]/[Ken Ichijoji] in its name from your hand or trash without paying the cost.",
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [
                {
                  tokens: ["Davis Motomiya", "Ken Ichijoji"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
        },
        {
          kind: "PlaceInBattleAreaSelf",
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-097", compiled);
