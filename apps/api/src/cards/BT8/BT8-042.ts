// @ts-nocheck
// Hand-authored override — do not regenerate.
// [When Digivolving]: two effects, second gated on DNA digivolving condition.
// 1) If you have 5 or fewer security cards: Recovery +1 (place top deck card on security).
// 2) ONLY when DNA digivolving: return 1 opponent Digimon whose level ≤ your security count.
//    Level filter uses kind:"securityAtMost" reference — engine resolves at time of targeting.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";
const compiled: CompiledCard = {
  dnaDigivolveRequirement: [
    {
      cost: 0,
      materials: [
        {
          color: "Yellow",
          level: 4,
        },
        {
          color: "Blue",
          level: 4,
        },
      ],
    },
  ],
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addTop",
          controller: "mine",
          source: "deck",
          amount: 1,
          condition: {
            kind: "zoneCount",
            seat: "mine",
            zone: "security",
            op: "lte",
            value: 5,
            raw: "you have 5 or fewer security cards",
          },
        },
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
          condition: {
            kind: "isDnaDigivolving",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "ModifyDP",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
            },
            count: 1,
          },
          amount: -3000,
          duration: "forTheTurn",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-042", compiled);
