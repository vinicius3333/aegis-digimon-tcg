// HAND-AUTHORED OVERRIDE (no AUTO-GENERATED header => the generator preserves this file).
//
// (node tools/kb/query.mjs card BT25-045: no card-specific Q&A; general link rules apply).
//
// The recipient-scoped GrantLinkCostReduction models the cross-actor WhenWouldLink rule: during
// your turn, any Social/Tool/Game card linking to this Digimon may have its link cost reduced by 1.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      // The link-cost-reduction discharge: [Your Turn][Once Per Turn] link a [Social]/[Tool]/[Game]
      // trait card to this Digimon with the cost reduced by 1 (costDelta:-1 floors the paid cost).
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      optional: true,
      actions: [
        {
          kind: "GrantLinkCostReduction",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 1,
          whenLinkingTrait: ["Social", "Tool", "Game"],
          duration: "permanent",
          optionalAtDeclaration: true,
          oncePerTurn: true,
        },
      ],
    },
    {
      trigger: "WhenLinking",
      isLinked: true,
      actions: [
        {
          kind: "Suspend",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"] },
            count: 1,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      level: 2,
      colors: ["Green"],
      cost: 0,
      isAlternate: false,
    },
    {
      level: 2,
      cost: 0,
      isAlternate: true,
      traits: ["Appmon"],
    },
  ],
  linkRequirement: [
    {
      cost: 1,
      traits: ["Appmon"],
    },
  ],
};

registerIrCard("BT25-045", compiled);
