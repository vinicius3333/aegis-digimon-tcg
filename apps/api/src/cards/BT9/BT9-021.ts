// @ts-nocheck
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-corrected IR for BT9-021 (Jellymon).
// Both printed clauses are [Your Turn][Once Per Turn] event watchers. The
// inherited watcher is deliberately keyed to whenEffectAddsToHand, which
// includes effect-driven returns and draws and is scoped to this controller's hand.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Blue"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          raw: "when you play a blue Tamer, draw 1",
        },
      ],
      frequency: "OncePerTurn",
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectAddsToHand",
          actions: [
            {
              kind: "Return",
              target: { filter: { controller: "opponent", kind: ["Digimon"], levels: [3] }, count: 1 },
              to: "hand",
            },
          ],
          raw: "when an effect adds a card to your hand, return 1 opposing level 3 Digimon to its owner's hand",
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT9-021", compiled);
