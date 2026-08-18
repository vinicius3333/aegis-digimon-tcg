import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-maintained: the self-resolving whenTrashedFromDeck seam reads registered IR for the
// loose card after it reaches trash. A static hand-written watcher cannot be installed from deck.
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "AllTurns",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromDeck",
          sourceFilter: { isSelfRef: true },
          actions: [{ kind: "GainMemory", amount: 1 }],
          raw: "when this card is trashed from your deck, gain 1 memory",
        },
      ],
    },
    {
      trigger: "WhenAttacking",
      actions: [
        {
          kind: "Return",
          target: {
            filter: {
              controller: "mine",
              zone: "hand",
              colors: ["Purple"],
            },
            count: 1,
          },
          to: "deckTop",
          optional: true,
          raw: "reveal 1 purple card from your hand and place it on top of your deck",
        },
      ],
      isInherited: true,
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("P-077", compiled);
