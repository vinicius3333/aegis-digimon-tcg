import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      isInherited: true,
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
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT25-004", compiled);
