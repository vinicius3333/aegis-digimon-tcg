// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Level 5 or lower Digimon card with [Aqua]/[Sea Animal] in any of its traits from your hand as 1 of your Digimon's bottom digivolution card",
            host: {
              filter: { controller: "mine", kind: ["Digimon"] },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                levelComparison: {
                  op: "lte",
                  value: 5,
                },
                nameOrTrait: [
                  {
                    tokens: ["Aqua", "Sea Animal"],
                    match: "trait",
                  },
                ],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 Level 5 or lower Digimon card with [Aqua]/[Sea Animal] in any of its traits from your hand as 1 of your Digimon's bottom digivolution card",
            host: {
              filter: { controller: "mine", kind: ["Digimon"] },
              count: 1,
            },
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: {
              isSelfRef: true,
            },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Aquatic"],
        },
      ],
    },
    {
      trigger: "EndOfAttack",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-164", compiled);
