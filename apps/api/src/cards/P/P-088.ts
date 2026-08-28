// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// KB Q4180: When this Digimon has 12000+ DP and opponent has 2+ Digimon with <=6000 DP,
// you MUST delete 2 (can't choose to delete only 1).
// "delete 2 such Digimon instead" = replacement: at 12000+ DP delete 2 (<=6000 DP targets),
// not 1. Modeled as conditional count on a single Delete action.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          amount: 2000,
          duration: "forTheTurn",
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                nameOrTrait: [{ tokens: ["Gammamon"], match: "name" }],
              },
              count: 1,
              from: ["hand"],
            },
            raw: "By placing 1 card with [Gammamon] in its name from your hand as this Digimon's bottom digivolution card",
            destination: "digivolutionStack",
            position: "bottom",
            host: "self",
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      // [When Attacking] Delete 1 (or 2 if this Digimon has 12000+ DP) opponent Digimon
      // with 6000 DP or less. "Delete 2 such Digimon instead" = 2 targets of the same filter.
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 6000 },
            },
            count: {
              kind: "conditional",
              condition: {
                kind: "selfDpAtLeast",
                value: 12000,
                raw: "this Digimon has 12000 DP or more",
              },
              then: 2,
              else: 1,
            },
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-088", compiled);
