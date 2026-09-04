// @ts-nocheck
// Hand-fixed IR for EX4-061 (Matt Ishida & Tai Kamiya).
// Text: "[Your Turn][Once Per Turn] When one of your Digimon digivolves, if you have
// 1 or fewer Digimon, you may play 1 [Gabumon] if that Digimon has [Greymon] in its
// name or 1 [Agumon] if it has [Garurumon] in its name from your hand or trash without
// paying the cost."
//
// Fixes:
// 1. The single PlayWithoutCost target filter allowed any card matching Gabumon/Greymon/
//    Agumon/Garurumon name tokens, letting Greymon/Garurumon cards themselves be played
//    and dropping the name-linkage entirely — split into two mutually exclusive branches,
//    each targeting only the correct card name.
// 2. Neither branch checked the digivolving Digimon's name; added a
//    `triggerSubjectMatchesFilter` gate (reads the whenOneOfYoursDigivolves subject's
//    top-card name, same pattern used elsewhere for TriggerInfo.subjectPermanentId reads).
// 3. The board-size gate used `youHave` (>= 1, i.e. "1 or more"), inverted from the
//    printed "1 or fewer" — replaced with `permanentCount` op "lte" value 1.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controllerDefault: "mine",
            nameOrTrait: [
              {
                tokens: ["Gabumon", "Agumon"],
                match: "nameExact",
              },
            ],
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
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
              optional: true,
              abortOnDecline: true,
            },
          ],
          raw: "whenPlayed",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          actions: [
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Gabumon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
              condition: {
                kind: "allOf",
                conditions: [
                  {
                    kind: "permanentCount",
                    op: "lte",
                    value: 1,
                    filter: {
                      kind: ["Digimon"],
                    },
                    raw: "you have 1 or fewer Digimon",
                  },
                  {
                    kind: "triggerSubjectMatchesFilter",
                    filter: {
                      nameOrTrait: [
                        {
                          tokens: ["Greymon"],
                          match: "name",
                        },
                      ],
                    },
                    raw: "that Digimon has [Greymon] in its name",
                  },
                ],
              },
              optional: true,
            },
            {
              kind: "PlayWithoutCost",
              target: {
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Agumon"],
                      match: "nameExact",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand", "trash"],
              payCost: false,
              condition: {
                kind: "allOf",
                conditions: [
                  {
                    kind: "permanentCount",
                    op: "lte",
                    value: 1,
                    filter: {
                      kind: ["Digimon"],
                    },
                    raw: "you have 1 or fewer Digimon",
                  },
                  {
                    kind: "triggerSubjectMatchesFilter",
                    filter: {
                      nameOrTrait: [
                        {
                          tokens: ["Garurumon"],
                          match: "name",
                        },
                      ],
                    },
                    raw: "that Digimon has [Garurumon] in its name",
                  },
                ],
              },
              optional: true,
            },
          ],
          raw: "whenOneOfYoursDigivolves",
        },
      ],
      frequency: "OncePerTurn",
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

registerIrCard("EX4-061", compiled);
