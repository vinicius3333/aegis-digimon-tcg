import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// P-186 Gallantmon — the Japanese printed text and Q4629/Q4630 establish “13000 DP or more.”
// The English Q&A translation says “or less”; Japanese source wording takes priority.
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
                  controller: "any",
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
              controller: "any",
              kind: ["Digimon"],
              dp: {
                op: "gte",
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
              controller: "any",
              kind: ["Digimon"],
              dp: {
                op: "gte",
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
