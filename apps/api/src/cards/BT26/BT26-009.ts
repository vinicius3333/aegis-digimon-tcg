// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT26-009 Hyokomon — start-main hand-trash cost, plus inherited attack draw
// and the six-card hand-size return-to-deck-bottom clause.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "StartOfYourMainPhase",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "trash",
            target: {
              filter: {
                zone: "hand",
                controller: "mine",
                nameOrTrait: [
                  { tokens: ["Chronomon"], match: "text" },
                  { tokens: ["Shaman"], match: "trait" },
                ],
              },
              count: 1,
            },
          },
          optional: false,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        {
          kind: "Return",
          target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
          to: "deckBottom",
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "gte", value: 6 },
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-009", compiled);
