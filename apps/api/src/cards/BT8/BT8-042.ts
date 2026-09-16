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
          effectTextPart:
            "Then, when DNA digivolving, return 1 of your opponent's Digimon whose level is less than or equal to the number of cards in your security stack to its owner's hand.",
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
