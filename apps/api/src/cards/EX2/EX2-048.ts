// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Security",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["ADR-02 Searcher"],
                  match: "name",
                },
              ],
            },
            count: 1,
            from: ["battleArea", "hand"],
          },
          underFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Mother D-Reaper"],
                match: "name",
              },
            ],
          },
          optional: true,
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["ADR-02 Searcher"],
                  match: "name",
                },
              ],
            },
            count: 1,
            from: ["battleArea", "hand"],
          },
          underFilter: {
            controller: "mine",
            nameOrTrait: [
              {
                tokens: ["Mother D-Reaper"],
                match: "name",
              },
            ],
          },
          optional: true,
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("EX2-048", compiled);
