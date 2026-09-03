import type { CompiledCard, Cost } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-102 (Attack of the Heavy Mobile Digimon!).
const handCost: Cost = {
  kind: "trash",
  target: {
    filter: {
      zone: "hand",
      controller: "mine",
      nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
    },
    count: 1,
  },
  raw: "by trashing 1 card with [Cyborg] or [Machine] in its traits in your hand",
};
const securityHandCost: Cost = {
  kind: "trash",
  target: {
    filter: {
      zone: "hand",
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["Cyborg", "Machine"], match: "trait" }],
    },
    count: 1,
  },
  bindResultAs: "trashedSecurityCard",
  raw: "by trashing 1 Digimon card with [Cyborg] or [Machine] in its traits in your hand",
};
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "Main",
      actions: [
        {
          kind: "GainKeyword",
          target: { filter: { controller: "mine", kind: ["Digimon"], levels: [6], traits: ["Machine"] }, count: "all" },
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          cost: handCost,
          optional: true,
          includeLaterEntrants: true,
        },
        {
          kind: "GrantStatic",
          target: { filter: { controller: "mine", kind: ["Digimon"], levels: [6], traits: ["Machine"] }, count: "all" },
          grant: "effects",
          tokens: ["OnPlayBlitzIfHasDigivolutionCard"],
          duration: "forTheTurn",
          condition: { kind: "ifThisEffectActed", raw: "you did" },
          includeLaterEntrants: true,
        },
      ],
    },
    {
      trigger: "Security",
      actions: [
        {
          kind: "Delete",
          target: {
            filter: {
              controller: "opponent",
              kind: ["Digimon"],
              relativeTo: { attr: "playCost", op: "lte", selectionRef: "trashedSecurityCard" },
            },
            count: 1,
          },
          cost: securityHandCost,
          optional: true,
        },
      ],
      isSecurity: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-102", compiled);
