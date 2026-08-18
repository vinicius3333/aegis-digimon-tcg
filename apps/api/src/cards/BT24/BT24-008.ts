import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT24-008 Elizamon (hand-authored override of the runtime record IR).
//
// + conditional rule implementation shape the prose compiler misses (see BT24-009). Authored as a Draw 2 carrying
// an optional trash-from-hand cost (engine payCost hand branch).
//
// EqualsTraits("Reptile"|"Dragonkin"|"LIBERATOR"), maxCount 1, canNoSelect:true; `if (cardSources>0)`
// runs rule implementation(owner, 2). The inherited [Your Turn][Once Per Turn] gain-memory ESS compiled correctly
// and is carried through unchanged.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OnPlay",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          cost: {
            kind: "trash",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [
                  { tokens: ["Reptile"], match: "trait" },
                  { tokens: ["Dragonkin"], match: "trait" },
                  { tokens: ["LIBERATOR"], match: "trait" },
                ],
              },
              count: 1,
            },
            raw: "By trashing 1 card with the [Reptile], [Dragonkin] or [LIBERATOR] trait from your hand",
          },
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          raw: "When your opponent's security stack is removed from, gain 1 memory.",
          actions: [{ kind: "GainMemory", amount: 1 }],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT24-008", compiled);
