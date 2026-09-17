import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

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
          optional: true,
          abortOnDecline: true,
        },
        { kind: "GainMemory", amount: 1 },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          effectTextPart: "[When Attacking] [Once Per Turn] ＜Draw 1＞",
          kind: "Draw",
          controller: "mine",
          amount: 1,
        },
        {
          effectTextPart:
            "Then, if your hand has 6 or more cards, return 1 card in your hand to the bottom of the deck.",
          kind: "Return",
          target: { filter: { zone: "hand", controller: "mine" }, count: 1 },
          to: "deckBottom",
          condition: { kind: "zoneCount", seat: "mine", zone: "hand", op: "gte", value: 6 },
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-009", compiled);
