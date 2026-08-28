// @ts-nocheck
// SpawnToken target), not the base "Diaboromon"; the play is gated on this Digimon having
// had the [Unidentified] trait (evaluated against its card definition).
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Infermon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
                raw: "that Digimon is level 5 or higher",
              },
              optional: true,
            },
          ],
        },
        {
          kind: "SubTrigger",
          event: "whenOneOfYoursDigivolves",
          sourceFilter: {
            controller: "opponent",
            kind: ["Digimon"],
          },
          actions: [
            {
              kind: "Digivolve",
              target: {
                filter: {
                  isSelfRef: true,
                },
                count: 1,
                isSelf: true,
              },
              into: {
                filter: {
                  controllerDefault: "mine",
                  nameOrTrait: [
                    {
                      tokens: ["Infermon"],
                      match: "name",
                    },
                  ],
                },
                count: 1,
              },
              from: ["hand"],
              payCost: false,
              ignoreRequirements: true,
              condition: {
                kind: "triggerSubjectMatchesFilter",
                filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } },
                raw: "that Digimon is level 5 or higher",
              },
              optional: true,
            },
          ],
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "PlayToken",
          tokens: ["Diaboromon Token"],
          count: 1,
          payCost: false,
          condition: {
            kind: "selfHasTrait",
            filter: { nameOrTrait: [{ tokens: ["Unidentified"], match: "trait" }] },
            raw: "this Digimon had [Unidentified] trait",
          },
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT17-053", compiled);
