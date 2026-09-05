// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "both",
          amount: 2,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Guilmon"],
                  match: "nameExact",
                },
                {
                  tokens: ["Growlmon", "Gallantmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
    },
    {
      trigger: "OnDeletion",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Guilmon"],
                  match: "nameExact",
                },
                {
                  tokens: ["Growlmon", "Gallantmon"],
                  match: "name",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
          optional: true,
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 3,
      names: ["Guilmon"],
      cost: 2,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX4-008", compiled);
