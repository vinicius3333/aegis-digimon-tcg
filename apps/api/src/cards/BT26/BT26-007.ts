// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT26-007 Swipemon — inherited [When Attacking] [Once Per Turn]: you may
// link one [Seven Code] Digimon from hand or this stack, with cost -2.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Link",
          target: {
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              hasLinkRequirement: true,
              nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }],
            },
            count: 1,
            source: "thisDigimon",
          },
          from: ["hand", "digivolutionCards"],
          costDelta: -2,
          optional: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-007", compiled);
