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
