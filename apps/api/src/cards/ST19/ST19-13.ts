// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Armor Purge",
          raw: "＜Armor Purge＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
                nameOrTrait: [
                  {
                    tokens: ["Puppet"],
                    match: "trait",
                  },
                  {
                    tokens: ["Numemon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 level 5 or lower card with [Puppet] trait or with [Numemon] in its name from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                zone: "trash",
                controller: "mine",
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
                nameOrTrait: [
                  {
                    tokens: ["Puppet"],
                    match: "trait",
                  },
                  {
                    tokens: ["Numemon"],
                    match: "name",
                  },
                ],
              },
              count: 1,
              from: ["trash"],
            },
            raw: "By placing 1 level 5 or lower card with [Puppet] trait or with [Numemon] in its name from your trash as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 5,
      names: ["Monzaemon", "Numemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("ST19-13", compiled);
