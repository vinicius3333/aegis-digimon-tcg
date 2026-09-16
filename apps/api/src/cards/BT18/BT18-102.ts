import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 10000 },
            },
            count: 1,
          },
          dpCeilingScaling: {
            per: 1,
            filter: {
              zone: "digivolutionCards",
              controllerDefault: "mine",
            },
            amount: 2000,
            unit: "colors",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              dp: { op: "lte", value: 10000 },
            },
            count: 1,
          },
          dpCeilingScaling: {
            per: 1,
            filter: {
              zone: "digivolutionCards",
              controllerDefault: "mine",
            },
            amount: 2000,
            unit: "colors",
          },
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "SecurityManipulation",
          op: "addBottom",
          controller: "mine",
          source: {
            filter: {
              controller: "mine",
              kind: ["Tamer"],
              zone: "digivolutionCards",
              hostFilter: { isSelfRef: true },
            },
            count: 5,
            upTo: true,
          },
          toTop: false,
          optional: true,
          abortOnDecline: true,
          trackCount: "placedTamers",
          raw: "By placing up to 5 Tamer cards from this Digimon's digivolution cards as your bottom security cards",
        },
        {
          kind: "SecurityManipulation",
          op: "trashTop",
          controller: "opponent",
          amountFromNamedCount: { base: 0, countSource: "placedTamers", per: 1 },
          raw: "trash opponent's top security cards for each card placed by this effect",
        },
      ],
    },
    {
      trigger: "Rule",
      actions: [
        {
          kind: "GrantStatic",
          target: {
            filter: { isSelfRef: true },
            count: 1,
            isSelf: true,
          },
          grant: "trait",
          tokens: ["Hybrid"],
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      namesExact: ["Takuya Kanbara", "Koji Minamoto", "Takuya Kanbara & Koji Minamoto"],
      cost: 6,
      isAlternate: true,
      requiredDigivolutionCardCount: { trait: "Hybrid", min: 10 },
      incompatibleWithBlastDigivolve: true,
    },
  ],
};

registerIrCard("BT18-102", compiled);
