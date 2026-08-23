// @ts-nocheck
// HAND-AUTHORED OVERRIDE — maintained as a direct implementation. The declarative effect used the
// nonexistent SubTriggerEvent "whenDeckTrashed"; the real event is "onDiscardLibrary",
// whose default gate (no sourceFilter) watches the OPPONENT's deck being milled, so an
// explicit "controller": "mine" sourceFilter is required for "when a card is trashed
// from YOUR deck" (inheritedEffectText) — including this card's own [WhenDigivolving]
// TrashTopDeck mill.
import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

const compiled: CompiledCard = {
  effects: [
    {
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "TrashTopDeck",
          controller: "mine",
          amount: 2,
        },
        {
          kind: "Return",
          target: {
            filter: {
              zone: "trash",
              controller: "mine",
              nameOrTrait: [
                {
                  tokens: ["Demon Lord"],
                  match: "trait",
                },
              ],
            },
            count: 1,
          },
          to: "hand",
        },
      ],
    },
    {
      trigger: "YourTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "onDiscardLibrary",
          sourceFilter: {
            controller: "mine",
          },
          actions: [
            {
              kind: "GainMemory",
              amount: 1,
            },
          ],
        },
      ],
      isInherited: true,
      frequency: "OncePerTurn",
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT8-079", compiled);
