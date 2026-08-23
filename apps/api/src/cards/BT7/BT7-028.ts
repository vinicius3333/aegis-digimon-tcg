// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "PlayWithoutCost",
          target: {
            filter: {
              controller: "mine",
              or: [
                {
                  kind: ["Digimon"],
                  levels: [3],
                },
                {
                  kind: ["Digimon"],
                  nameOrTrait: [
                    {
                      tokens: ["Whamon"],
                      match: "nameExact",
                    },
                  ],
                },
              ],
              zone: "digivolutionCards",
            },
            count: 1,
          },
          fromOwnDigivolutionStack: true,
          payCost: false,
          optional: true,
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
            kind: ["Digimon"],
            fromDigivolution: true,
          },
          actions: [
            {
              kind: "TrashDigivolution",
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
              amount: 99,
              raw: "Trash all of the digivolution cards of that Digimon.",
            },
            {
              kind: "Return",
              target: {
                filter: {},
                count: 1,
                sameTarget: true,
              },
              to: "hand",
            },
          ],
          raw: "whenPlayed",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT7-028", compiled);
