import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          optional: true,
          abortOnDecline: true,
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenSecurityRemoved",
          sourceFilter: { controller: "opponent" },
          fireCondition: {
            kind: "triggerRemovedSecuritySeat",
            seat: "opponent",
          },
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
