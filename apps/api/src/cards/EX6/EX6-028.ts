// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Behavior is executed by the shared interpreter; this file only carries the IR and
// registers it. To override with a hand-written module, delete the AUTO-GENERATED
// header line above and replace the body — the generator will then preserve this file.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Counter",
      actions: [],
      isFromHand: true,
      keywords: [
        {
          keyword: "BlastDigivolve",
          raw: "＜Blast Digivolve＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [],
      keywords: [
        {
          keyword: "Recovery",
          amount: 1,
          raw: "＜Recovery +1 (Deck)＞",
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [],
      keywords: [
        {
          keyword: "Recovery",
          amount: 1,
          raw: "＜Recovery +1 (Deck)＞",
        },
      ],
    },
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenAddSecurity",
          fireCondition: {
            kind: "triggerSecurityIsYours",
          },
          actions: [
            {
              kind: "Return",
              target: {
                filter: {
                  controller: "opponent",
                  kind: ["Digimon"],
                  levelComparison: {
                    op: "lte",
                    value: 0,
                    scaling: { unit: "security", per: 1, filter: { controller: "mine" } },
                  },
                },
                count: 1,
              },
              to: "hand",
            },
          ],
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["MagnaAngemon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("EX6-028", compiled);
