import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend all of your opponent's 5000 DP or lower Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: "all",
          },
        },
        {
          effectTextPart:
            "Then, for every 2 colors your Tamers have, return 1 of their suspended Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controllerDefault: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          scaling: {
            per: 2,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "colors",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          effectTextPart: "[On Play] [When Digivolving] Suspend all of your opponent's 5000 DP or lower Digimon.",
          kind: "Suspend",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 5000,
              },
            },
            count: "all",
          },
        },
        {
          effectTextPart:
            "Then, for every 2 colors your Tamers have, return 1 of their suspended Digimon to the bottom of the deck.",
          kind: "Return",
          target: {
            filter: {
              controllerDefault: "opponent",
              suspended: true,
              kind: ["Digimon"],
            },
            count: 1,
          },
          to: "deckBottom",
          scaling: {
            per: 2,
            filter: {
              controller: "mine",
              kind: ["Tamer"],
            },
            unit: "colors",
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
                raw: "if any of them have the [ADVENTURE] trait",
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
                raw: "if any of them have the [ADVENTURE] trait",
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

registerIrCard("ST21-09", compiled);
