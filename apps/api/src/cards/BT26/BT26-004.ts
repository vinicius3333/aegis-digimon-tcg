// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// BT26-004 Pagumon — inherited [When Attacking] [Once Per Turn]: by placing
// one card from hand face-down under any [Glowing Dawn] Tamer, draw 1.
export const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 1,
          cost: {
            kind: "place",
            target: {
              filter: {
                controller: "mine",
                zone: "hand",
                kind: ["Digimon", "Tamer", "Option"],
              },
              count: 1,
            },
            underFilter: {
              controller: "mine",
              kind: ["Tamer"],
              nameOrTrait: [{ tokens: ["Glowing Dawn"], match: "trait" }],
            },
            faceDown: true,
          },
          optional: true,
          abortOnDecline: true,
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT26-004", compiled);
