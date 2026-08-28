// @ts-nocheck
// HAND-FIXED IR — do not regenerate
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [
                {
                  tokens: ["Greymon", "Garurumon", "Omnimon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
          bindResultAs: "returnedCard",
        },
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          condition: {
            kind: "bindingEmpty",
            ref: "returnedCard",
          },
        },
      ],
    },
    {
      trigger: "AllTurns",
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
              kind: "GainMemory",
              amount: 0,
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
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Greymon"],
                      match: "name",
                    },
                  ],
                },
              },
            },
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Garurumon"],
                      match: "name",
                    },
                  ],
                },
              },
            },
          ],
          raw: "whenPlayed",
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
              kind: "GainMemory",
              amount: 0,
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
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Greymon"],
                      match: "name",
                    },
                  ],
                },
              },
            },
            {
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "youHave",
                filter: {
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Garurumon"],
                      match: "name",
                    },
                  ],
                },
              },
            },
          ],
          raw: "whenDigivolving",
        },
      ],
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

registerIrCard("EX9-066", compiled);
