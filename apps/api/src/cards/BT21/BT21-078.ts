// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// [On Play]/[When Digivolving]: Delete 1 opponent's Digimon Lv.4 or lower.
// If your Tamers have 2+ total colors, delete Lv.5 or lower INSTEAD (raised cap by 1).
// [Your Turn] [Once Per Turn]: When another of your Digimon is played or digivolves,
// IF any of them have [ADVENTURE] trait, 1 of your Digimon MUST gain <Alliance> for the turn
// (KB Q4588: mandatory when condition met). Then, 1 of your Digimon MAY attack (optional, KB Q4590).
// KB Q4732: attack part runs even if ADVENTURE condition is not met.
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
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          condition: {
            kind: "zoneColorCount",
            cardType: "Tamer",
            op: "gte",
            value: 2,
            raw: "your Tamers have 2 or more total colors",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          condition: {
            kind: "not",
            condition: { kind: "zoneColorCount", cardType: "Tamer", op: "gte", value: 2 },
            raw: "your Tamers don't have 2 or more total colors",
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
              levelComparison: {
                op: "lte",
                value: 5,
              },
            },
            count: 1,
          },
          condition: {
            kind: "zoneColorCount",
            cardType: "Tamer",
            op: "gte",
            value: 2,
            raw: "your Tamers have 2 or more total colors",
          },
        },
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              levelComparison: {
                op: "lte",
                value: 4,
              },
            },
            count: 1,
          },
          condition: {
            kind: "not",
            condition: { kind: "zoneColorCount", cardType: "Tamer", op: "gte", value: 2 },
            raw: "your Tamers don't have 2 or more total colors",
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
                filter: {
                  nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }],
                },
                raw: "any of them have the [ADVENTURE] trait",
              },
            },
            {
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
                filter: {
                  nameOrTrait: [{ tokens: ["ADVENTURE"], match: "trait" }],
                },
                raw: "any of them have the [ADVENTURE] trait",
              },
            },
            {
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
      names: ["Garurumon"],
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

registerIrCard("BT21-078", compiled);
