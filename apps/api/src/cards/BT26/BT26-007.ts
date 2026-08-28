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
              nameOrTrait: [{ tokens: ["Seven Code"], match: "trait" }],
              // "from your hand or this Digimon's digivolution cards": the hand branch
              // must carry no hostFilter (a hostFilter branch only matches hosted zones),
              // while the stack branch is pinned to this Digimon's own stack.
              or: [{ zone: "hand" }, { zone: "digivolutionCards", hostFilter: { isSelfRef: true } }],
            },
            count: 1,
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
