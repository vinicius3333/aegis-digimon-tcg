// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4017: Delete any number of opponent's Digimon whose total DP ≤ this Digimon's DP.
// Must choose at least 1 (KB Q4018). Encoded as DeleteByDpBudget capability.
// KB Q4012-4015: the [Agumon] digivolve requires 2 or fewer security cards at resolution.
const compiled: CompiledCard = {
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
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: "all",
            // "equal or less than THIS Digimon's DP": read the live DP, not the printed 14000.
            totalDpCapFromSourceDp: true,
            totalDpCap: 14000,
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
            },
            count: "all",
            // "equal or less than THIS Digimon's DP": read the live DP, not the printed 14000.
            totalDpCapFromSourceDp: true,
            totalDpCap: 14000,
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amount: 1,
          condition: {
            kind: "youHave",
            filter: {
              controllerDefault: "mine",
              kind: ["Tamer"],
            },
            raw: "you have a Tamer",
          },
        },
      ],
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["Agumon"],
      cost: 3,
      isAlternate: true,
      // `whileCondition` is the field the digivolve validator reads, and it accepts a
      // `zoneCount` shape only; the previous `condition: { kind: "securityCountLte" }` was
      // ignored outright, leaving the Cost 3 path available at any security count (Q4014).
      whileCondition: {
        kind: "zoneCount",
        seat: "mine",
        zone: "security",
        op: "lte",
        value: 2,
        raw: "while you have 2 or fewer security cards",
      },
    },
  ],
};

registerIrCard("LM-021", compiled);
