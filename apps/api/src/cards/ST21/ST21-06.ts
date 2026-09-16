import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "opponent",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          sourceDpCeilingScaling: {
            per: 2,
            filter: { controller: "mine", kind: ["Tamer"] },
            unit: "colors",
            amount: 2000,
          },
          toTop: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "placeAsSecurity",
          controller: "opponent",
          source: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 6000,
              },
            },
            count: 1,
          },
          sourceDpCeilingScaling: {
            per: 2,
            filter: { controller: "mine", kind: ["Tamer"] },
            unit: "colors",
            amount: 2000,
          },
          toTop: true,
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
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] [Once Per Turn] When your other Digimon are played or digivolve, if any of them have the [ADVENTURE] trait, 1 of your Digimon gains ＜Alliance＞ for the turn.",
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              keyword: {
                keyword: "Alliance",
                raw: "＜Alliance＞",
              },
              duration: "forTheTurn",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
                raw: "any of them have the [ADVENTURE] trait",
              },
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
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "mine",
            excludeSelf: true,
            kind: ["Digimon"],
          },
          actions: [
            {
              effectTextPart:
                "[Your Turn] [Once Per Turn] When your other Digimon are played or digivolve, if any of them have the [ADVENTURE] trait, 1 of your Digimon gains ＜Alliance＞ for the turn.",
              kind: "GainKeyword",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                },
                count: 1,
              },
              keyword: {
                keyword: "Alliance",
                raw: "＜Alliance＞",
              },
              duration: "forTheTurn",
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }] },
                raw: "any of them have the [ADVENTURE] trait",
              },
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
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "Static",
      actions: [],
      isInherited: true,
      keywords: [
        {
          keyword: "Alliance",
          raw: "＜Alliance＞",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 4,
      traits: ["ADVENTURE"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST21-06", compiled);
