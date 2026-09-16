import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [],
      keywords: [
        {
          keyword: "Blitz",
          raw: "＜Blitz＞",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "GrantCanAttackUnsuspended",
          target: {
            filter: {
              isSelfRef: true,
              digivolutionStackNameOrTrait: [{ tokens: ["OmniShoutmon", "X Antibody"], match: "nameExact" }],
            },
            count: 1,
            isSelf: true,
          },
          duration: "forTheTurn",
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
  digivolutionRequirement: [
    {
      names: ["OmniShoutmon"],
      cost: 0,
      isAlternate: true,
    },
  ],
};

registerIrCard("BT9-013", compiled);
