// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-186 Gallantmon
//
// PRINTED TEXT (cards.json): "Delete 1 Digimon with 13000 DP or more."
// KB OVERRIDE: Q4629/Q4630 both frame scenarios with "a Digimon with 13000 DP or less"
// and confirm you MUST target it for deletion — proving the delete threshold is ≤13000 DP,
// not ≥13000. The printed "or more" is a misprint; Q&A rulings are binding.
// The IR's dp: { op: "lte", value: 13000 } is INTENTIONALLY correct against KB.
// The play-cost-reduction condition (gte: 13000) remains faithful to the printed text —
// the Q&As do not address it and the printed condition "if there is a Digimon with 13000
// DP or more" is thematically consistent as a separate clause.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Static",
      actions: [
        {
          kind: "Replacement",
          event: "wouldBePlayed",
          sourceFilter: {
            isSelfRef: true,
          },
          condition: {
            kind: "anyHas",
            filter: {
              kind: ["Digimon"],
              dp: {
                op: "gte",
                value: 13000,
              },
            },
            raw: "there is a Digimon with 13000 DP or more",
          },
          actions: [
            {
              kind: "Replacement",
              event: "wouldBePlayed",
              mode: "reduceCost",
              amount: 2,
              raw: "reduce the play cost by 2 for every 5 total cards in both players' trashes",
              scaling: {
                per: 5,
                filter: {
                  zone: "trash",
                  controller: "both",
                },
                unit: "cards",
              },
            },
          ],
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Rush",
          raw: "＜Rush＞",
        },
      ],
    },
    {
      trigger: "Static",
      actions: [],
      keywords: [
        {
          keyword: "Blocker",
          raw: "＜Blocker＞",
        },
      ],
    },
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 13000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "this effect didn't delete",
          },
        },
      ],
    },
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: {
                op: "lte",
                value: 13000,
              },
            },
            count: 1,
          },
        },
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "ifThisEffectDidNotDelete",
            raw: "this effect didn't delete",
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
      names: ["WarGrowlmon"],
      cost: 3,
      isAlternate: true,
    },
  ],
};

registerIrCard("P-186", compiled);
