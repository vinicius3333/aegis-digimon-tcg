import type { CompiledCard } from "@aegis/shared";
import { registerIrCard } from "../../engine/effects/interpreter.js";

// Hand-written override for BT10-006 (Tokomon). source: documented behavior.
// The AUTO-GENERATED header has been removed to protect this file from overwrite.
//
// SEMANTIC CORRECTIONS (Phase 10.1-08):
//
// Auto-declarative effect record had unconditional [Opponent's Turn] Draw 1 — wrong.
// is specifically trashed from under a Digimon (on opponent's turn), draw 1.
//
// Phase 13 (Plan 13-02): onDigivolutionCardDiscarded SubTrigger event now available.
//
const compiled: CompiledCard = {
  effects: [
    {
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [
        {
          kind: "SubTrigger",
          event: "onDigivolutionCardsDiscardedBatch",
          actions: [
            {
              kind: "Draw",
              controller: "mine",
              amount: 1,
            },
          ],
          raw: "[Opponent's Turn] When THIS digivolution card is trashed by an effect, Draw 1.",
          sourceFilter: {
            isSelfRef: true,
          },
        },
      ],
    },
  ],
  coverage: "full",
  residual: [],
};

registerIrCard("BT10-006", compiled);
