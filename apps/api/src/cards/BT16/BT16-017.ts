import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
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
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "anyOf",
                conditions: [
                  {
                    kind: "triggerSubjectMatchesFilter",
                    filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
                  },
                  { kind: "triggerSubjectHasColor", filter: { colors: ["Green"] } },
                ],
                raw: "it has the [Free] trait or is green",
              },
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
              kind: "GainMemory",
              amount: 1,
              condition: {
                kind: "anyOf",
                conditions: [
                  {
                    kind: "triggerSubjectMatchesFilter",
                    filter: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
                  },
                  { kind: "triggerSubjectHasColor", filter: { colors: ["Green"] } },
                ],
                raw: "it has the [Free] trait or is green",
              },
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "permanent",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["DemiVeemon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT16-017", compiled);
export { compiled };
